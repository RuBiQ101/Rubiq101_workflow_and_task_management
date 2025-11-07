import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('workspace/:workspaceId')
  getWorkspaceActivities(
    @Param('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.activityService.getWorkspaceActivities(
      workspaceId,
      pageNum,
      limitNum,
    );
  }

  @Get('project/:projectId')
  getProjectActivities(
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.activityService.getProjectActivities(
      projectId,
      pageNum,
      limitNum,
    );
  }

  @Get('task/:taskId')
  getTaskActivities(
    @Param('taskId') taskId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.activityService.getTaskActivities(taskId, pageNum, limitNum);
  }
}
