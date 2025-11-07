import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    // Extract organizationId from various sources
    const orgId =
      request.params.organizationId ||
      request.params.orgId ||
      request.body?.organizationId ||
      request.query?.organizationId;

    if (!orgId) {
      this.logger.warn(
        `No organizationId found in request for user ${user.id}`,
      );
      throw new ForbiddenException('Organization context required');
    }

    // Check user membership and role
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
      },
    });

    if (!membership) {
      this.logger.warn(
        `User ${user.id} is not a member of organization ${orgId}`,
      );
      throw new ForbiddenException('Not a member of this organization');
    }

    // Check if user has one of the required roles
    if (requiredRoles.includes(membership.roleKey)) {
      this.logger.debug(
        `User ${user.id} has required role ${membership.roleKey} for org ${orgId}`,
      );
      return true;
    }

    this.logger.warn(
      `User ${user.id} has role ${membership.roleKey} but requires one of: ${requiredRoles.join(', ')}`,
    );
    throw new ForbiddenException(
      `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}`,
    );
  }
}
