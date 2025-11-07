import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private io: Server;
  private readonly logger = new Logger(RealtimeService.name);

  init(io: Server) {
    this.io = io;
    this.logger.log('RealtimeService initialized');
  }

  emitTaskUpdated(task: any) {
    if (!this.io) return;
    // broadcast to relevant rooms: project, workspace, task
    this.io.to(`project:${task.projectId}`).emit('task.updated', task);
    this.io.to(`task:${task.id}`).emit('task.updated', task);
    if (task.assigneeId) {
      this.io.to(`user:${task.assigneeId}`).emit('task.updated', task);
    }
    this.logger.debug(`Emitted task.updated for task ${task.id}`);
  }

  emitTaskCreated(task: any) {
    if (!this.io) return;
    this.io.to(`project:${task.projectId}`).emit('task.created', task);
    this.logger.debug(`Emitted task.created for task ${task.id}`);
  }

  emitTaskDeleted(taskId: string, projectId: string) {
    if (!this.io) return;
    this.io.to(`project:${projectId}`).emit('task.deleted', { id: taskId });
    this.logger.debug(`Emitted task.deleted for task ${taskId}`);
  }

  emitCommentCreated(comment: any) {
    if (!this.io) return;
    this.io.to(`task:${comment.taskId}`).emit('comment.created', comment);
    this.logger.debug(`Emitted comment.created for task ${comment.taskId}`);
  }

  emitCommentDeleted(commentId: string, taskId: string) {
    if (!this.io) return;
    this.io.to(`task:${taskId}`).emit('comment.deleted', { id: commentId });
    this.logger.debug(`Emitted comment.deleted ${commentId}`);
  }

  emitAttachmentAdded(attachment: any) {
    if (!this.io) return;
    this.io.to(`task:${attachment.taskId}`).emit('attachment.added', attachment);
    this.logger.debug(`Emitted attachment.added for task ${attachment.taskId}`);
  }

  emitNotification(userId: string, notification: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('notification', notification);
    this.logger.debug(`Emitted notification to user ${userId}`);
  }

  emitProjectUpdated(project: any) {
    if (!this.io) return;
    this.io.to(`workspace:${project.workspaceId}`).emit('project.updated', project);
    this.logger.debug(`Emitted project.updated for project ${project.id}`);
  }

  emitActivityCreated(activity: any) {
    if (!this.io) return;
    if (activity.workspaceId) {
      this.io.to(`workspace:${activity.workspaceId}`).emit('activity.created', activity);
    }
    if (activity.projectId) {
      this.io.to(`project:${activity.projectId}`).emit('activity.created', activity);
    }
    this.logger.debug(`Emitted activity.created: ${activity.type}`);
  }
}
