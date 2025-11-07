import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { InviteController } from './invite.controller';
import { PrismaService } from '../prisma.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [MailerModule],
  controllers: [AdminController, InviteController],
  providers: [AdminService, PrismaService],
  exports: [AdminService],
})
export class AdminModule {}
