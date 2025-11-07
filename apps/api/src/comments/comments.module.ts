import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import {
  CommentsController,
  CommentManagementController,
} from './comments.controller';
import { PrismaService } from '../prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [CommentsController, CommentManagementController],
  providers: [CommentsService, PrismaService],
})
export class CommentsModule {}
