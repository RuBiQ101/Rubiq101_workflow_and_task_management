import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { PrismaService } from '../prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [AttachmentsController],
  providers: [PrismaService],
})
export class AttachmentsModule {}
