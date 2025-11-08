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
  Request,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: any,
  ) {
    return this.taskService.create(projectId, createTaskDto, req.user?.id);
  }

  @Get()
  listByProject(
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.taskService.listByProject(projectId, pageNum, limitNum, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<CreateTaskDto>) {
    return this.taskService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskService.delete(id);
  }

  @Post(':id/subtasks')
  addSubtask(@Param('id') id: string, @Body('title') title: string) {
    return this.taskService.addSubtask(id, title);
  }

  @Put('subtasks/:subtaskId')
  toggleSubtask(
    @Param('subtaskId') subtaskId: string,
    @Body('isDone') isDone: boolean,
  ) {
    return this.taskService.toggleSubtask(subtaskId, isDone);
  }

  @Post('move')
  moveTask(
    @Param('projectId') projectId: string,
    @Body() body: { taskId: string; toColumn: string; toIndex: number },
    @Request() req: any,
  ) {
    return this.taskService.moveTask(
      projectId,
      body.taskId,
      body.toColumn,
      body.toIndex,
      req.user?.id,
    );
  }

  @Post('reorder')
  reorder(
    @Param('projectId') projectId: string,
    @Body() body: { columns: Record<string, string[]> },
    @Request() req: any,
  ) {
    return this.taskService.reorder(projectId, body.columns, req.user?.id);
  }
}
