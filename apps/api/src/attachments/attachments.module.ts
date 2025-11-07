import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsPresignController } from './attachments.presign.controller';
import { AttachmentsPresignGetController } from './attachments.presign-get.controller';
import { PrismaService } from '../prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [
    AttachmentsController,
    AttachmentsPresignController,
    AttachmentsPresignGetController,
  ],
  providers: [PrismaService],
})
export class AttachmentsModule {}
