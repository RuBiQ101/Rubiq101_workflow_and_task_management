import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationService } from './organization.service';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const userId = req.user.id;
    return this.organizationService.createOrganization(
      userId,
      body.name,
      body.description,
    );
  }

  @Get()
  async list(@Req() req: any) {
    const userId = req.user.id;
    return this.organizationService.getUserOrganizations(userId);
  }
}
