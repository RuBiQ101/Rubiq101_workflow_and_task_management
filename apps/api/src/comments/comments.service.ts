import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  // Sanitize helper - allow basic formatting tags but strip scripts/styles
  sanitize(content: string) {
    if (!content) return content;
    return sanitizeHtml(content, {
      allowedTags: [
        'b',
        'i',
        'em',
        'strong',
        'a',
        'p',
        'ul',
        'ol',
        'li',
        'br',
        'code',
        'pre',
        'blockquote',
      ],
      allowedAttributes: {
        a: ['href', 'rel', 'target'],
      },
      allowedSchemesByTag: {
        a: ['http', 'https', 'mailto', 'tel'],
      },
    });
  }

  // Create comment on a task (with optional parentId for threading)
  async create(
    taskId: string,
    authorId: string,
    content: string,
    parentId?: string,
  ) {
    // Sanitize content
    const safe = this.sanitize(content);

    // Ensure task exists
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: { organization: { include: { members: true } } },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Simple membership check: ensure author is member of org
    const isMember = task.project.workspace.organization.members.some(
      (m) => m.userId === authorId,
    );
    if (!isMember) {
      throw new ForbiddenException('Not authorized to comment on this task');
    }

    // If parentId provided ensure parent comment exists and belongs to same task
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.taskId !== taskId) {
        throw new NotFoundException('Parent comment not found or invalid');
      }
    }

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        authorId,
        taskId,
        content: safe,
        parentId: parentId ?? null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Write activity
    await this.prisma.activity.create({
      data: {
        actorId: authorId,
        organizationId: task.project.workspace.organization.id,
        workspaceId: task.project.workspaceId,
        projectId: task.projectId,
        taskId: taskId,
        type: 'comment.created',
        payload: {
          commentId: comment.id,
          content: comment.content,
        },
      },
    });

    // Emit realtime
    this.realtime.emitCommentCreated(comment);

    // Notify task assignee if different from commenter
    if (task.assigneeId && task.assigneeId !== authorId) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: task.assigneeId,
          actorId: authorId,
          type: 'comment_on_task',
          data: {
            taskId: task.id,
            commentId: comment.id,
            text: comment.content,
          },
        },
      });

      this.realtime.emitNotification(task.assigneeId, {
        type: 'comment_on_task',
        message: `New comment on task "${task.title}"`,
        data: {
          taskId: task.id,
          commentId: comment.id,
          notification,
        },
      });
    }

    return comment;
  }

  // List comments for a task (paginated, threaded)
  async listByTask(taskId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { taskId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where: { taskId } }),
    ]);

    // Transform into nested structure (threaded)
    const map: Record<string, any> = {};
    const roots: any[] = [];
    items.forEach((c) => {
      map[c.id] = { ...c, children: [] };
    });
    items.forEach((c) => {
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    return { items: roots, total, page, limit };
  }

  // Cursor-based pagination (new): returns items (flat) newest-first, plus nextCursor (id)
  async listByTaskCursor(taskId: string, limit = 20, cursor?: string) {
    const take = limit;
    const findArgs: any = {
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1, // get extra to know if there is a next page
    };

    if (cursor) {
      // cursor is comment id; find the comment to use as cursor point
      findArgs.skip = 1;
      findArgs.cursor = { id: cursor };
    }

    const results = await this.prisma.comment.findMany(findArgs);
    const hasNext = results.length > limit;
    if (hasNext) results.pop(); // remove extra

    // return items in newest first order
    const nextCursor = hasNext ? results[results.length - 1].id : null;
    return { items: results, nextCursor, limit, hasNext };
  }

  // Update comment
  async update(commentId: string, userId: string, content: string) {
    const safe = this.sanitize(content);

    const comm = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: {
              include: {
                workspace: {
                  include: { organization: { include: { members: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!comm) {
      throw new NotFoundException('Comment not found');
    }

    // Allow only author or admin/owner of org to edit
    const isAuthor = comm.authorId === userId;
    const orgMembers = comm.task.project.workspace.organization.members;
    const member = orgMembers.find((m) => m.userId === userId);
    const isAdmin =
      member && (member.roleKey === 'owner' || member.roleKey === 'admin');

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Not allowed to edit this comment');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: safe },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    await this.prisma.activity.create({
      data: {
        actorId: userId,
        organizationId: comm.task.project.workspace.organization.id,
        workspaceId: comm.task.project.workspaceId,
        projectId: comm.task.projectId,
        taskId: comm.taskId,
        type: 'comment.updated',
        payload: { commentId, content: safe },
      },
    });

    // Emit realtime (reuse comment.created event or create comment.updated)
    this.realtime.emitCommentCreated(updated);
    return updated;
  }

  // Delete/remove comment
  async remove(commentId: string, userId: string) {
    const comm = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: true,
        task: {
          include: {
            project: {
              include: {
                workspace: {
                  include: { organization: { include: { members: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!comm) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comm.authorId === userId;
    const member = comm.task.project.workspace.organization.members.find(
      (m) => m.userId === userId,
    );
    const isAdmin =
      member && (member.roleKey === 'owner' || member.roleKey === 'admin');

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Not allowed to remove this comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    await this.prisma.activity.create({
      data: {
        actorId: userId,
        organizationId: comm.task.project.workspace.organization.id,
        workspaceId: comm.task.project.workspaceId,
        projectId: comm.task.projectId,
        taskId: comm.taskId,
        type: 'comment.deleted',
        payload: { commentId },
      },
    });

    // Emit realtime event to let clients remove comment
    this.realtime.emitCommentDeleted(commentId, comm.taskId);
    return { ok: true };
  }

  // Toggle reaction on a comment
  async toggleReaction(commentId: string, userId: string, type: string) {
    // ensure comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: {
              include: {
                workspace: {
                  include: { organization: { include: { members: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // ensure user is member
    const isMember = comment.task.project.workspace.organization.members.some(
      (m) => m.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Not authorized');
    }

    // check if reaction exists
    const existing = await this.prisma.reaction
      .findUnique({
        where: {
          userId_commentId_type: {
            userId,
            commentId,
            type,
          },
        },
      })
      .catch(() => null);

    if (existing) {
      // remove (toggle off)
      await this.prisma.reaction.delete({ where: { id: existing.id } });

      // optionally emit activity
      await this.prisma.activity.create({
        data: {
          actorId: userId,
          organizationId: comment.task.project.workspace.organization.id,
          workspaceId: comment.task.project.workspaceId,
          projectId: comment.task.projectId,
          taskId: comment.taskId,
          type: 'reaction.removed',
          payload: { commentId, type },
        },
      });

      this.realtime.emitCommentCreated({
        commentId,
        reactionRemoved: { userId, type },
      } as any);
      return { removed: true };
    } else {
      // create reaction
      const created = await this.prisma.reaction.create({
        data: { userId, commentId, type },
      });

      await this.prisma.activity.create({
        data: {
          actorId: userId,
          organizationId: comment.task.project.workspace.organization.id,
          workspaceId: comment.task.project.workspaceId,
          projectId: comment.task.projectId,
          taskId: comment.taskId,
          type: 'reaction.added',
          payload: { commentId, type },
        },
      });

      // emit realtime event with reaction info
      this.realtime.emitCommentCreated({
        commentId,
        reactionAdded: { userId, type },
      } as any);
      return { added: true, reaction: created };
    }
  }

  // helper: load reactions counts and current user's reactions for a list of comment ids
  async getReactionsForComments(commentIds: string[], userId?: string) {
    if (!commentIds || commentIds.length === 0) return {};

    const reactions = await this.prisma.reaction.findMany({
      where: { commentId: { in: commentIds } },
    });

    // build counts and whether current user reacted
    const map: Record<string, any> = {};
    for (const r of reactions) {
      map[r.commentId] = map[r.commentId] || { counts: {}, my: {} };
      map[r.commentId].counts[r.type] =
        (map[r.commentId].counts[r.type] || 0) + 1;
      if (userId && r.userId === userId) {
        map[r.commentId].my[r.type] = true;
      }
    }
    return map;
  }

  // Legacy method for backward compatibility
  async getCommentsByTask(taskId: string, userId: string) {
    // Verify task exists and user has access
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: { organization: { include: { members: true } } },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isMember = task.project.workspace.organization.members.some(
      (m) => m.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Not authorized to view task comments');
    }

    return this.prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Legacy method for backward compatibility
  async delete(commentId: string, userId: string) {
    return this.remove(commentId, userId);
  }
}
