import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    private activity: ActivityService,
  ) {}

  async create(projectId: string, dto: CreateTaskDto, userId?: string) {
    const data: any = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      project: { connect: { id: projectId } },
    };
    if (dto.dueDate) {
      data.dueDate = new Date(dto.dueDate);
    }
    const task = await this.prisma.projectTask.create({
      data,
      include: { project: { include: { workspace: true } } },
    });

    // Log activity
    await this.activity.createActivity({
      actorId: userId,
      organizationId: task.project.workspace.organizationId,
      workspaceId: task.project.workspaceId,
      projectId: task.projectId,
      taskId: task.id,
      type: 'task.created',
      payload: { title: task.title, status: task.status },
    });

    // Emit realtime event
    this.realtime.emitTaskCreated(task);

    return task;
  }

  async get(taskId: string) {
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
      include: { subtasks: true, project: { include: { workspace: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async listByProject(projectId: string, page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { projectId };
    if (status) where.status = status;
    
    const [items, total] = await Promise.all([
      this.prisma.projectTask.findMany({
        where,
        include: { subtasks: true },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.projectTask.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async update(taskId: string, data: Partial<CreateTaskDto>) {
    const updateData: any = { ...data };
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }
    return this.prisma.projectTask.update({
      where: { id: taskId },
      data: updateData,
    });
  }

  async delete(taskId: string) {
    return this.prisma.projectTask.delete({ where: { id: taskId } });
  }

  async addSubtask(taskId: string, title: string) {
    return this.prisma.subtask.create({
      data: {
        title,
        task: { connect: { id: taskId } },
      },
    });
  }

  async toggleSubtask(subtaskId: string, isDone: boolean) {
    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data: { isDone },
    });
  }
}
