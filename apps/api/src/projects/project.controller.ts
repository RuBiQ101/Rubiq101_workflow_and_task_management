import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectService.create(workspaceId, createProjectDto);
  }

  @Get()
  listByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.projectService.listByWorkspace(workspaceId, pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectService.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<CreateProjectDto>) {
    return this.projectService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectService.delete(id);
  }
}
