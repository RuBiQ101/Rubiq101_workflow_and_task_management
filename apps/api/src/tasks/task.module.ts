import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { PrismaService } from '../prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [RealtimeModule, ActivityModule],
  controllers: [TaskController],
  providers: [TaskService, PrismaService],
})
export class TaskModule {}
