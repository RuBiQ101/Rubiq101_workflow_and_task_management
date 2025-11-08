import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';
import { WidgetAdminController } from './widget-admin.controller';
import { PrismaService } from '../prisma.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret',
      signOptions: { expiresIn: '5m' }, // Default 5 minutes for widget sessions
    }),
    MailerModule,
  ],
  controllers: [WidgetController, WidgetAdminController],
  providers: [WidgetService, PrismaService],
  exports: [WidgetService],
})
export class WidgetModule {}
