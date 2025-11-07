import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { ProjectModule } from './projects/project.module';
import { TaskModule } from './tasks/task.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ActivityModule } from './activity/activity.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    OrganizationModule,
    ProjectModule,
    TaskModule,
    RealtimeModule,
    ActivityModule,
    AttachmentsModule,
    CommentsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
