import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Public invite endpoints (no organization context needed)
 */
@Controller('invite')
export class InviteController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Public endpoint to check invite validity
   * GET /invite/check?token=abc123
   */
  @Get('check')
  async checkInvite(@Query('token') token: string) {
    return this.adminService.checkInviteToken(token);
  }

  /**
   * Logged-in user accepting an invite
   * POST /invite/:token/accept
   */
  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(@Param('token') token: string, @Req() req: any) {
    return this.adminService.acceptInvite(token, req.user.id);
  }
}
