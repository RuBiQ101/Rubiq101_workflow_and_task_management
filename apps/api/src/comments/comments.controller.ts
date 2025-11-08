import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@Controller('projects/:projectId/tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async create(
    @Param('taskId') taskId: string,
    @Body() body: CreateCommentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.commentsService.create(
      taskId,
      userId,
      body.content,
      body.parentId,
    );
  }

  @Get()
  async getAll(
    @Param('taskId') taskId: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id;
    return this.commentsService.listByTask(
      taskId,
      Number(page || 1),
      Number(limit || 50),
    );
  }

  // cursor-based list:
  @Get('cursor')
  async listCursor(
    @Param('taskId') taskId: string,
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const res = await this.commentsService.listByTaskCursor(
      taskId,
      Number(limit || 20),
      cursor,
    );

    // also fetch reactions summary for these comments for the current user
    const commentIds = res.items.map((c: any) => c.id);
    const reactionsMap = await this.commentsService.getReactionsForComments(
      commentIds,
      req.user?.id,
    );

    return { ...res, reactionsMap };
  }
}

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentManagementController {
  constructor(private readonly commentsService: CommentsService) {}

  @Put(':id')
  async update(
    @Param('id') commentId: string,
    @Body() body: UpdateCommentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.commentsService.update(commentId, userId, body.content);
  }

  @Delete(':id')
  async delete(@Param('id') commentId: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.commentsService.remove(commentId, userId);
  }

  // Reaction toggle
  @Post(':id/reactions')
  async toggleReaction(
    @Param('id') commentId: string,
    @Body() body: { type: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.commentsService.toggleReaction(commentId, userId, body.type);
  }
}
