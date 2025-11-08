import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import Stripe from 'stripe';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('organization/:organizationId/subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async subscribe(
    @Param('organizationId') orgId: string,
    @Body() body: { priceId: string },
  ) {
    return this.billingService.createSubscription(orgId, body.priceId);
  }

  @Post('organization/:organizationId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async cancel(
    @Param('organizationId') orgId: string,
    @Body() body: { immediate?: boolean },
  ) {
    return this.billingService.cancelSubscription(orgId, body.immediate);
  }

  @Get('organization/:organizationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'member')
  async getSubscription(@Param('organizationId') orgId: string) {
    return this.billingService.getSubscription(orgId);
  }

  @Post('organization/:organizationId/portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getPortalUrl(
    @Param('organizationId') orgId: string,
    @Body() body: { returnUrl: string },
  ) {
    return this.billingService.createPortalSession(orgId, body.returnUrl);
  }
}

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      // apiVersion will use the default from the package
    });

    let event: Stripe.Event;

    try {
      // Get raw body (needs to be configured in main.ts)
      const payload: any = req.rawBody || req.body;
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error: any) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }

    // Process the event
    await this.billingService.handleWebhookEvent(event);

    return { received: true };
  }
}
