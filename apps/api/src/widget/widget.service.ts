import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { URL } from 'url';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class WidgetService {
  private logger = new Logger('WidgetService');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailer: MailerService,
  ) {}

  /**
   * Create a page token for widget embedding (admin only)
   * Returns the token which should be shown only once to the admin
   */
  async createPageToken(
    orgId: string,
    description: string | null,
    allowedOrigins: string[] = [],
    createdBy?: string,
  ) {
    const token = randomBytes(32).toString('hex'); // Secure opaque token
    
    const rec = await this.prisma.pageToken.create({
      data: {
        orgId,
        token,
        description: description ?? null,
        allowedOrigins: allowedOrigins,
        createdBy: createdBy ?? null,
      },
    });
    
    return rec;
  }

  /**
   * List all non-revoked page tokens for an organization
   */
  async listPageTokens(orgId: string) {
    const tokens = await this.prisma.pageToken.findMany({
      where: { orgId, revoked: false },
      orderBy: { createdAt: 'desc' },
    });
    
    return tokens;
  }

  /**
   * Revoke a page token
   */
  async revokePageToken(tokenId: string) {
    return this.prisma.pageToken.update({
      where: { id: tokenId },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Exchange pageToken for ephemeral JWT for widget use
   * Logs usage and notifies org admins the first time an origin uses this token
   */
  async createWidgetSession(
    pageToken: string,
    originHeader: string | null,
    ip?: string,
    userAgent?: string,
  ) {
    if (!pageToken) {
      throw new BadRequestException('pageToken is required');
    }

    // Find the page token
    const rec = await this.prisma.pageToken.findUnique({
      where: { token: pageToken },
    });

    if (!rec || rec.revoked) {
      throw new BadRequestException('Invalid or revoked page token');
    }

    // Normalize origin
    let origin: string | null = null;
    if (originHeader) {
      try {
        // Accept either Origin header, or Referer header (which is a full url)
        if (originHeader.startsWith('http')) {
          const u = new URL(originHeader);
          origin = `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
        } else {
          // already origin-like (https://site.com)
          origin = originHeader;
        }
      } catch (e) {
        origin = originHeader;
      }
    }

    // If the token has allowedOrigins set (non-empty), ensure origin matches one entry
    if (rec.allowedOrigins && rec.allowedOrigins.length > 0) {
      if (!origin) {
        throw new ForbiddenException('Origin header required for this token');
      }
      const match = rec.allowedOrigins.some((o: string) => {
        // allow exact match or wildcard subdomain (*.example.com)
        if (o.startsWith('*.')) {
          // wildcard match: strip "*." and match end
          const domain: string = o.slice(2);
          return origin!.endsWith(domain);
        }
        return origin === o;
      });
      if (!match) {
        // Log suspicious attempt for audit
        await this.prisma.pageTokenUsage.create({
          data: {
            pageTokenId: rec.id,
            origin: origin ?? 'unknown',
            ip: ip ?? null,
            userAgent: userAgent ?? null,
          },
        });
        throw new ForbiddenException('Origin not allowed for this token');
      }
    }

    // At this point origin is allowed (or not enforced).
    // Create usage record for audit
    await this.prisma.pageTokenUsage.create({
      data: {
        pageTokenId: rec.id,
        origin: origin ?? 'unknown',
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });

    // Determine whether this origin has been seen before for this token
    const existingCount = await this.prisma.pageTokenUsage.count({
      where: { pageTokenId: rec.id, origin: origin ?? 'unknown' },
    });

    // If this is the very first usage (existingCount === 1 now), notify org admins
    if (existingCount === 1) {
      try {
        // Find org admins (owner/admin members)
        const members = await this.prisma.organizationMember.findMany({
          where: {
            organizationId: rec.orgId,
            roleKey: { in: ['owner', 'admin'] },
          },
          include: { user: true },
        });
        const emails = members
          .map((m) => m.user?.email)
          .filter(Boolean) as string[];

        if (emails.length > 0) {
          const subject = `[Workflo] New widget usage from ${origin ?? 'unknown'}`;
          const inviteLink = `${process.env.APP_URL || 'http://localhost:5173'}/organization/${rec.orgId}/widget-admin/page-tokens`;
          const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
              <h2>New Widget Usage Detected</h2>
              <p>Hello —</p>
              <p>Your page token <strong>${rec.description ?? rec.token.slice(0, 8)}</strong> was used for the first time from this origin:</p>
              <ul style="list-style:none;padding:0;background:#f7fafc;padding:16px;border-radius:6px;margin:16px 0">
                <li><strong>Origin:</strong> <code>${origin ?? 'unknown'}</code></li>
                <li><strong>IP:</strong> <code>${ip ?? 'unknown'}</code></li>
                <li><strong>User-Agent:</strong> <code style="font-size:12px">${userAgent ?? 'unknown'}</code></li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
              </ul>
              <p>If this is expected, no action is needed. If this looks suspicious you can revoke the token or limit its allowed origins.</p>
              <p style="margin:24px 0">
                <a href="${inviteLink}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Manage Page Tokens</a>
              </p>
              <hr style="margin-top:24px;color:#eee">
              <div style="font-size:12px;color:#666">Sent by ${process.env.APP_URL || 'http://localhost:5173'}</div>
            </div>
          `;

          // Send email to org admins (reusing sendInviteEmail for simplicity)
          await Promise.all(
            emails.map((email) =>
              this.mailer
                .sendInviteEmail(email, inviteLink, undefined, subject)
                .catch((err) => {
                  this.logger.warn(
                    'Failed to notify admin via email: ' +
                      (err?.message || err),
                  );
                }),
            ),
          );
          this.logger.log(
            `Notified ${emails.length} admin(s) about new origin usage for token ${rec.id}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          'Error notifying admins about new origin: ' + (err?.message || err),
        );
      }
    }

    // Mint ephemeral JWT
    const payload = {
      sub: `widget:${rec.orgId}`,
      orgId: rec.orgId,
      src: 'widget',
      tokenId: rec.id,
    };

    const jwt = this.jwtService.sign(payload, {
      expiresIn: '5m', // short life
    });

    return {
      jwt,
      orgId: rec.orgId,
      expiresIn: 300, // seconds
    };
  }

  /**
   * Get widget configuration for an organization
   * Returns public configuration that the widget needs
   */
  async getWidgetConfig(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    // Get subscription to determine features
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });

    const planKey = subscription?.planKey || 'free';

    // Define features based on plan
    const features = {
      realtime: true,
      allowAttachments: planKey !== 'free',
      maxTasksPerWidget: planKey === 'enterprise' ? -1 : planKey === 'pro' ? 100 : 10,
      customBranding: planKey === 'enterprise',
    };

    return {
      orgId: org.id,
      name: org.name,
      description: org.description,
      plan: planKey,
      features,
    };
  }

  /**
   * Update allowed origins for a page token
   */
  async updatePageTokenOrigins(tokenId: string, allowedOrigins: string[]) {
    return this.prisma.pageToken.update({
      where: { id: tokenId },
      data: {
        allowedOrigins: allowedOrigins,
      },
    });
  }
}
