import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async createActivity(data: {
    actorId?: string;
    organizationId?: string;
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
    type: string;
    payload: any;
  }) {
    return this.prisma.activity.create({
      data: {
        actorId: data.actorId,
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        taskId: data.taskId,
        type: data.type,
        payload: data.payload,
      },
    });
  }

  async getWorkspaceActivities(
    workspaceId: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { workspaceId } }),
    ]);
    return { items, total, page, limit };
  }

  async getProjectActivities(
    projectId: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { projectId } }),
    ]);
    return { items, total, page, limit };
  }

  async getTaskActivities(taskId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { taskId } }),
    ]);
    return { items, total, page, limit };
  }
}
