// src/mailer/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { config as loadEnv } from 'dotenv';
loadEnv();

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

@Injectable()
export class MailerService {
  private logger = new Logger('MailerService');
  private from = process.env.MAIL_FROM || 'no-reply@example.com';
  private appUrl = process.env.APP_URL || 'http://localhost:5173';

  async sendInviteEmail(to: string, inviteUrl: string, inviterName?: string, orgName?: string) {
    const subject = `${inviterName ? inviterName + ' invited you to join ' : 'You were invited to join '}${orgName ?? 'an organization'}`;
    const html = this.composeInviteHtml(inviteUrl, inviterName, orgName);
    try {
      const msg = {
        to,
        from: this.from,
        subject,
        html,
      };
      await sgMail.send(msg);
      this.logger.log(`Invite email sent to ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error('SendGrid error', err?.response?.body || err?.message || err);
      throw err;
    }
  }

  composeInviteHtml(inviteUrl: string, inviterName?: string, orgName?: string) {
    // simple responsive template
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.4;color:#111">
        <h2>${inviterName ? inviterName : 'Someone'} invited you to join ${orgName ?? 'an organization'}</h2>
        <p>Click the button below to accept the invite and join.</p>
        <p style="margin:24px 0">
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Accept invite</a>
        </p>
        <p style="color:#666;font-size:13px">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;color:#0066cc">${inviteUrl}</p>
        <hr style="margin-top:24px;color:#eee">
        <div style="font-size:12px;color:#666">Sent by ${this.appUrl}</div>
      </div>
    `;
  }
}
