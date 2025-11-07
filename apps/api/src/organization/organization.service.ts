import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(userId: string, name: string, description?: string) {
    return this.prisma.organization.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: { members: true },
    });
  }

  async getUserOrganizations(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: { some: { userId } },
      },
      include: { workspaces: true },
    });
  }
}
