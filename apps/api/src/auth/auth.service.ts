import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    name?: string,
    inviteToken?: string,
  ) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new UnauthorizedException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    });

    // If inviteToken provided, automatically join organization
    if (inviteToken) {
      try {
        await this.acceptInvite(inviteToken, user.id);
      } catch (error: any) {
        this.logger.warn(
          `Failed to accept invite during registration: ${error.message}`,
        );
        // Continue with registration even if invite acceptance fails
      }
    }

    return this.login(email, password); // return token directly
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException();
    const accessToken = this.jwt.sign(
      { sub: user.id },
      { secret: process.env.JWT_SECRET!, expiresIn: '7d' },
    );
    return { accessToken };
  }

  /**
   * Accept an invite token and add user to organization
   */
  private async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.usedAt) {
      throw new Error('Invite already used');
    }

    if (invite.expiresAt < new Date()) {
      throw new Error('Invite expired');
    }

    // Check if already a member
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: invite.organizationId,
        userId,
      },
    });

    if (existingMember) {
      this.logger.warn(
        `User ${userId} is already a member of org ${invite.organizationId}`,
      );
      return;
    }

    // Create membership
    await this.prisma.organizationMember.create({
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
          via: 'registration',
        },
      },
    });

    this.logger.log(
      `User ${userId} joined org ${invite.organizationId} via invite ${invite.id}`,
    );
  }
}
