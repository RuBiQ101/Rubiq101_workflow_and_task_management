import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { WidgetService } from './widget.service';

@Controller('widget')
export class WidgetController {
  constructor(private widgetSvc: WidgetService) {}

  /**
   * Public endpoint: Exchange pageToken for ephemeral JWT
   * This is called by the widget embed script to get authentication
   * 
   * POST /widget/session
   * Body: { pageToken: string }
   * Returns: { jwt: string, orgId: string, expiresIn: number }
   */
  @Post('session')
  async createSession(@Body() body: { pageToken: string }, @Req() req: any) {
    const origin = (req.headers.origin as string) || (req.headers.referer as string) || null;
    const ip = req.headers['x-forwarded-for']
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
      : req.connection?.remoteAddress || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.widgetSvc.createWidgetSession(body.pageToken, origin, ip, userAgent);
  }

  /**
   * Public endpoint: Get widget configuration
   * Returns public configuration for the widget
   * 
   * GET /widget/config/:orgId
   * Returns: { orgId, name, features, plan, etc. }
   */
  @Get('config/:orgId')
  async getConfig(@Param('orgId') orgId: string) {
    return this.widgetSvc.getWidgetConfig(orgId);
  }
}
