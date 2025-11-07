import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        workspace: { connect: { id: workspaceId } },
      },
    });
  }

  async get(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: true, workspace: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async listByWorkspace(workspaceId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { workspaceId },
        include: { tasks: { take: 5 } },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.project.count({ where: { workspaceId } }),
    ]);
    return { items, total, page, limit };
  }

  async update(projectId: string, data: Partial<CreateProjectDto>) {
    return this.prisma.project.update({
      where: { id: projectId },
      data,
    });
  }

  async delete(projectId: string) {
    return this.prisma.project.delete({ where: { id: projectId } });
  }
}
