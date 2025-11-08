import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { WidgetService } from './widget.service';
import { CreatePageTokenDto } from './dto/create-page-token.dto';

@Controller('organization/:organizationId/widget-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WidgetAdminController {
  constructor(private widgetSvc: WidgetService) {}

  /**
   * Create a new page token for widget embedding
   * Only owners and admins can create page tokens
   * 
   * POST /organization/:organizationId/widget-admin/page-tokens
   * Body: { description?: string, allowedOrigins?: string[] }
   * Returns: PageToken (including the token which should be shown once)
   */
  @Post('page-tokens')
  @Roles('owner', 'admin')
  async createPageToken(
    @Param('organizationId') orgId: string,
    @Body() body: CreatePageTokenDto,
    @Req() req: any,
  ) {
    // Normalize allowed origins: ensure they are valid URLs
    const normalizedOrigins = body.allowedOrigins?.map(o => o.trim()).filter(Boolean) || [];
    
    const result = await this.widgetSvc.createPageToken(
      orgId,
      body.description ?? null,
      normalizedOrigins,
      req.user?.id,
    );
    
    // Return the token (will be shown only once to admin)
    return {
      ...result,
      warning: 'Save this token securely. It will not be shown again.',
    };
  }

  /**
   * List all non-revoked page tokens for an organization
   * Token strings are masked for security (only showing last 8 chars)
   * 
   * GET /organization/:organizationId/widget-admin/page-tokens
   * Returns: PageToken[]
   */
  @Get('page-tokens')
  @Roles('owner', 'admin')
  async listPageTokens(@Param('organizationId') orgId: string) {
    const tokens = await this.widgetSvc.listPageTokens(orgId);
    
    // Mask token strings for security (show only last 8 characters)
    return tokens.map(t => ({
      ...t,
      token: `...${t.token.slice(-8)}`,
      tokenMasked: true,
    }));
  }

  /**
   * Revoke a page token
   * Revoked tokens cannot be used to create widget sessions
   * 
   * DELETE /organization/:organizationId/widget-admin/page-tokens/:tokenId
   * Returns: Updated PageToken
   */
  @Delete('page-tokens/:tokenId')
  @Roles('owner', 'admin')
  async revokePageToken(
    @Param('organizationId') orgId: string,
    @Param('tokenId') tokenId: string,
  ) {
    return this.widgetSvc.revokePageToken(tokenId);
  }

  /**
   * Update allowed origins for a page token
   * Controls which domains can use this token
   * 
   * PATCH /organization/:organizationId/widget-admin/page-tokens/:tokenId/origins
   * Body: { allowedOrigins: string[] }
   * Returns: Updated PageToken
   */
  @Patch('page-tokens/:tokenId/origins')
  @Roles('owner', 'admin')
  async updatePageTokenOrigins(
    @Param('organizationId') orgId: string,
    @Param('tokenId') tokenId: string,
    @Body() body: { allowedOrigins: string[] },
  ) {
    return this.widgetSvc.updatePageTokenOrigins(tokenId, body.allowedOrigins);
  }
}
