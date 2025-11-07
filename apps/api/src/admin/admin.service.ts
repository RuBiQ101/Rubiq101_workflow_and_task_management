import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an invite token for a user to join an organization
   */
  async inviteMember(
    orgId: string,
    email: string,
    roleKey: string,
    invitedBy: string,
  ) {
    // Validate organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: orgId,
          userId: existingUser.id,
        },
      });

      if (existingMember) {
        throw new BadRequestException('User is already a member');
      }
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create invite token
    const invite = await this.prisma.inviteToken.create({
      data: {
        email,
        organizationId: orgId,
        roleKey,
        token,
        expiresAt,
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'member.invited',
        actorId: invitedBy,
        organizationId: orgId,
        metadata: {
          email,
          roleKey,
          inviteId: invite.id,
        },
      },
    });

    return {
      inviteId: invite.id,
      email,
      roleKey,
      token,
      expiresAt,
      inviteUrl: `${process.env.FRONTEND_URL}/invite/${token}`,
    };
  }

  /**
   * Accept an invite token and join the organization
   */
  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Invite already used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    // Verify user email matches invite
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== invite.email) {
      throw new BadRequestException('Invite email does not match user email');
    }

    // Check if already a member
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: invite.organizationId,
        userId,
      },
    });

    if (existingMember) {
      throw new BadRequestException('Already a member of this organization');
    }

    // Create membership
    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        roleKey: invite.roleKey,
      },
    });

    // Mark invite as used
    await this.prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'member.joined',
        actorId: userId,
        organizationId: invite.organizationId,
        metadata: {
          roleKey: invite.roleKey,
          inviteId: invite.id,
          via: 'invite-accept',
        },
      },
    });

    return {
      member,
      organization: invite.organization,
    };
  }

  /**
   * Check if an invite token is valid (public endpoint)
   */
  async checkInviteToken(token: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Invite already used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    return {
      email: invite.email,
      roleKey: invite.roleKey,
      expiresAt: invite.expiresAt,
      organization: invite.organization,
    };
  }

  /**
   * Change a member's role
   */
  async changeRole(
    orgId: string,
    targetUserId: string,
    newRoleKey: string,
    changedBy: string,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: targetUserId,
      },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const oldRole = member.roleKey;

    // Update role
    const updated = await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { roleKey: newRoleKey },
      include: { user: true },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'role.changed',
        actorId: changedBy,
        organizationId: orgId,
        metadata: {
          targetUserId,
          targetEmail: member.user.email,
          oldRole,
          newRole: newRoleKey,
        },
      },
    });

    return updated;
  }

  /**
   * List all members of an organization
   */
  async listMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(
    orgId: string,
    targetUserId: string,
    removedBy: string,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: targetUserId,
      },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Prevent removing the owner (check if ownerId matches targetUserId)
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (org?.ownerId === targetUserId) {
      throw new BadRequestException('Cannot remove organization owner');
    }

    // Delete membership (cascade will handle cleanup)
    await this.prisma.organizationMember.delete({
      where: { id: member.id },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'member.removed',
        actorId: removedBy,
        organizationId: orgId,
        metadata: {
          targetUserId,
          targetEmail: member.user.email,
          roleKey: member.roleKey,
        },
      },
    });

    return { success: true };
  }

  /**
   * Get organization details including owner
   */
  async getOrganization(orgId: string) {
    return this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        },
        subscription: true,
      },
    });
  }

  /**
   * List pending invites for an organization
   */
  async listInvites(orgId: string) {
    return this.prisma.inviteToken.findMany({
      where: {
        organizationId: orgId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke an invite token
   */
  async revokeInvite(inviteId: string, revokedBy: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Invite already used');
    }

    // Mark as expired by setting expiresAt to now
    await this.prisma.inviteToken.update({
      where: { id: inviteId },
      data: { expiresAt: new Date() },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'invite.revoked',
        actorId: revokedBy,
        organizationId: invite.organizationId,
        metadata: {
          inviteId,
          email: invite.email,
        },
      },
    });

    return { success: true };
  }
}
