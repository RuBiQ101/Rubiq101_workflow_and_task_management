import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(taskId: string, content: string, userId: string) {
    // Get task with full context for authorization and activity logging
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

    // Check user is member of organization
    const isMember = task.project.workspace.organization.members.some(
      (m) => m.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Not authorized to comment on this task');
    }

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        authorId: userId,
        taskId,
        content,
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

    // Create activity
    await this.prisma.activity.create({
      data: {
        actorId: userId,
        workspaceId: task.project.workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        type: 'comment.created',
        payload: {
          commentId: comment.id,
          content: comment.content,
        },
      },
    });

    // Emit realtime event
    this.realtime.emitCommentCreated(comment);

    // Notify task assignee if different from commenter
    if (task.assigneeId && task.assigneeId !== userId) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: task.assigneeId,
          actorId: userId,
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

  async delete(commentId: string, userId: string) {
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

    // Only comment author or org owner can delete
    const isAuthor = comment.authorId === userId;
    const isOrgOwner = comment.task.project.workspace.organization.ownerId === userId;

    if (!isAuthor && !isOrgOwner) {
      throw new ForbiddenException('Not authorized to delete this comment');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    // Create activity
    await this.prisma.activity.create({
      data: {
        actorId: userId,
        workspaceId: comment.task.project.workspaceId,
        projectId: comment.task.projectId,
        taskId: comment.taskId,
        type: 'comment.deleted',
        payload: {
          commentId,
        },
      },
    });

    // Emit realtime event
    this.realtime.emitCommentDeleted(commentId, comment.taskId);

    return { success: true };
  }
}
