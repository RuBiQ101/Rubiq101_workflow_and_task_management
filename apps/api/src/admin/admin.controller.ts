import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { InviteMemberDto, ChangeRoleDto } from './dto';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from '../prisma.service';

@Controller('organization/:organizationId/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  private logger = new Logger('AdminController');

  constructor(
    private readonly adminService: AdminService,
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('invite')
  @Roles('owner', 'admin')
  async inviteMember(
    @Param('organizationId') orgId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: any,
  ) {
    const inviterId = req.user?.id;
    const invite = await this.adminService.inviteMember(
      orgId,
      dto.email,
      dto.roleKey || 'member',
      inviterId,
    );

    // Fetch org and inviter details for email
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
    });

    // Build invite URL (frontend accepts token param)
    const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    const inviteUrl = `${appUrl}/invite/accept?token=${invite.token}`;

    // Send email (production)
    try {
      await this.mailerService.sendInviteEmail(
        dto.email,
        inviteUrl,
        inviter?.name,
        org?.name,
      );
    } catch (err: any) {
      // Log and continue - admin can resend later
      this.logger.warn(
        `Failed sending invite email: ${err?.message || err}`,
      );
    }

    // In development return token for easy testing
    if (process.env.INVITE_EMAIL_DEV_ECHO === 'true') {
      return { invite, debug: { token: invite.token, inviteUrl } };
    }

    return { ok: true, invite: { id: invite.id, email: invite.email } };
  }

  @Get('invites')
  @Roles('owner', 'admin')
  async listInvites(@Param('organizationId') orgId: string) {
    return this.adminService.listInvites(orgId);
  }

  @Delete('invites/:inviteId')
  @Roles('owner', 'admin')
  async revokeInvite(
    @Param('inviteId') inviteId: string,
    @Req() req: any,
  ) {
    return this.adminService.revokeInvite(inviteId, req.user.id);
  }

  @Post('members/:userId/role')
  @Roles('owner')
  async changeRole(
    @Param('organizationId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @Req() req: any,
  ) {
    return this.adminService.changeRole(
      orgId,
      userId,
      dto.roleKey,
      req.user.id,
    );
  }

  @Get('members')
  @Roles('owner', 'admin', 'member')
  async listMembers(@Param('organizationId') orgId: string) {
    return this.adminService.listMembers(orgId);
  }

  @Delete('members/:userId')
  @Roles('owner')
  async removeMember(
    @Param('organizationId') orgId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.adminService.removeMember(orgId, userId, req.user.id);
  }

  @Get('organization')
  @Roles('owner', 'admin', 'member')
  async getOrganization(@Param('organizationId') orgId: string) {
    return this.adminService.getOrganization(orgId);
  }
}
