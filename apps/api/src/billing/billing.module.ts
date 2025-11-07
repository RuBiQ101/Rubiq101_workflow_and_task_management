import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController, WebhookController } from './billing.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [BillingController, WebhookController],
  providers: [BillingService, PrismaService],
  exports: [BillingService],
})
export class BillingModule {}
