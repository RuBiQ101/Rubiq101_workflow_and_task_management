import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';

@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async create(
    @Param('taskId') taskId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.commentsService.create(taskId, content, userId);
  }

  @Get()
  async getAll(@Param('taskId') taskId: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.commentsService.getCommentsByTask(taskId, userId);
  }
}

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentManagementController {
  constructor(private readonly commentsService: CommentsService) {}

  @Delete(':id')
  async delete(@Param('id') commentId: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.commentsService.delete(commentId, userId);
  }
}
