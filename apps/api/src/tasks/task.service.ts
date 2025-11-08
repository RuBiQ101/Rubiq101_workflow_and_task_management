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

  // Move single task into toColumn at index toIndex (0 = top)
  async moveTask(
    projectId: string,
    taskId: string,
    toColumn: string,
    toIndex: number,
    userId?: string,
  ) {
    // Verify task exists and belongs to project
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
      include: { project: { include: { workspace: true } } },
    });
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException('Task not found');
    }

    // Recompute positions for affected columns inside transaction
    return await this.prisma.$transaction(async (tx) => {
      // 1) Fetch tasks in target column ordered by position
      const targetTasks = await tx.projectTask.findMany({
        where: { projectId, columnKey: toColumn },
        orderBy: { position: 'asc' },
      });

      // Insert our taskId at toIndex in the list
      // If the task was previously in the same column, remove first
      const filtered = targetTasks.filter((t) => t.id !== taskId);
      const newList = [
        ...filtered.slice(0, toIndex),
        task,
        ...filtered.slice(toIndex),
      ];

      // Reassign positions (0..n-1)
      for (let i = 0; i < newList.length; i++) {
        const t = newList[i];
        await tx.projectTask.update({
          where: { id: t.id },
          data: { columnKey: toColumn, position: i },
        });
      }

      // If moving from a different column, compress positions in source column
      if (task.columnKey !== toColumn) {
        const sourceTasks = await tx.projectTask.findMany({
          where: { projectId, columnKey: task.columnKey },
          orderBy: { position: 'asc' },
        });
        for (let i = 0; i < sourceTasks.length; i++) {
          const s = sourceTasks[i];
          await tx.projectTask.update({
            where: { id: s.id },
            data: { position: i },
          });
        }
      }

      // Fetch updated task to return
      const updatedTask = await tx.projectTask.findUnique({
        where: { id: taskId },
        include: { project: { include: { workspace: true } } },
      });

      // Log activity
      await this.activity.createActivity({
        actorId: userId,
        organizationId: updatedTask!.project.workspace.organizationId,
        workspaceId: updatedTask!.project.workspaceId,
        projectId: updatedTask!.projectId,
        taskId: updatedTask!.id,
        type: 'task.moved',
        payload: {
          title: updatedTask!.title,
          fromColumn: task.columnKey,
          toColumn,
          position: toIndex,
        },
      });

      // Emit realtime event so clients update
      this.realtime.emitTaskUpdated(updatedTask!);

      return { ok: true, task: updatedTask };
    });
  }

  // Reorder: full column map -> set positions exactly as provided
  async reorder(
    projectId: string,
    columns: Record<string, string[]>,
    userId?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      for (const [columnKey, ids] of Object.entries(columns)) {
        for (let i = 0; i < ids.length; i++) {
          await tx.projectTask.update({
            where: { id: ids[i] },
            data: { columnKey, position: i },
          });
        }
      }

      // Fetch all updated tasks
      const tasks = await tx.projectTask.findMany({
        where: { projectId },
        orderBy: { columnKey: 'asc' },
      });

      // Emit realtime event
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { workspace: true },
      });

      if (project) {
        await this.activity.createActivity({
          actorId: userId,
          organizationId: project.workspace.organizationId,
          workspaceId: project.workspaceId,
          projectId,
          type: 'tasks.reordered',
          payload: { columns },
        });
      }

      return { ok: true, tasks };
    });
  }
}
