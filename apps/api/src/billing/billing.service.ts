import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
    }
    this.stripe = new Stripe(stripeKey || 'sk_test_placeholder', {
      apiVersion: '2024-11-20.acacia',
    });
  }

  /**
   * Create Stripe customer for organization
   */
  async createCustomerForOrg(orgId: string, email: string) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { organizationId: orgId },
      });

      await this.prisma.subscription.upsert({
        where: { organizationId: orgId },
        update: { stripeCustomerId: customer.id },
        create: {
          organizationId: orgId,
          stripeCustomerId: customer.id,
          planKey: 'free',
          status: 'active',
        },
      });

      this.logger.log(`Created Stripe customer ${customer.id} for org ${orgId}`);
      return customer;
    } catch (error: any) {
      this.logger.error(`Failed to create customer: ${error.message}`);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Create subscription for organization
   */
  async createSubscription(orgId: string, priceId: string) {
    try {
      // Get or create subscription record
      let subscription = await this.prisma.subscription.findUnique({
        where: { organizationId: orgId },
        include: { organization: { include: { members: { include: { user: true } } } } },
      });

      let customerId = subscription?.stripeCustomerId;

      // Create customer if needed
      if (!customerId) {
        const owner = subscription.organization.members.find(m => m.roleKey === 'owner');
        const email = owner?.user.email || 'no-email@example.com';
        const customer = await this.createCustomerForOrg(orgId, email);
        customerId = customer.id;
      }

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });

      // Update database
      await this.prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          stripeSubscriptionId: stripeSubscription.id,
          planKey: priceId,
          status: stripeSubscription.status,
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      });

      this.logger.log(`Created subscription ${stripeSubscription.id} for org ${orgId}`);
      return stripeSubscription;
    } catch (error: any) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(orgId: string, immediate = false) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    try {
      const updated = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: !immediate,
        },
      );

      if (immediate) {
        await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }

      await this.prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          status: immediate ? 'canceled' : updated.status,
          cancelAtPeriodEnd: updated.cancel_at_period_end,
        },
      });

      this.logger.log(`Canceled subscription for org ${orgId}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Get customer portal URL
   */
  async createPortalSession(orgId: string, returnUrl: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No customer found');
    }

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error: any) {
      this.logger.error(`Failed to create portal session: ${error.message}`);
      throw new BadRequestException('Failed to create portal session');
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhookEvent(event: Stripe.Event) {
    this.logger.log(`Processing webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        planKey: 'free',
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice paid: ${invoice.id}`);
    // Additional logic if needed (e.g., send receipt email)
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.warn(`Payment failed for invoice: ${invoice.id}`);
    // Could send notification to organization owner
  }

  /**
   * Get subscription details
   */
  async getSubscription(orgId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
  }
}
