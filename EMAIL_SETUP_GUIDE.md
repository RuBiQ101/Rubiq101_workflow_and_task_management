# Email & Invite System Setup Guide

This guide covers the complete setup of the email delivery system using SendGrid and the invite acceptance flow for the frontend.

## Table of Contents

1. [Backend - SendGrid Setup](#backend-sendgrid-setup)
2. [Frontend - Invite Pages](#frontend-invite-pages)
3. [Testing](#testing)
4. [Production Configuration](#production-configuration)

---

## Backend - SendGrid Setup

### 1. Environment Variables

Add these variables to your `apps/api/.env`:

```env
# SendGrid (for emails)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
MAIL_FROM=YourApp <no-reply@yourapp.com>

# Frontend URL (used in invite emails)
APP_URL=http://localhost:5173

# Dev mode: return invite token in API response for testing
INVITE_EMAIL_DEV_ECHO=true
```

**Get your SendGrid API key:**
1. Sign up at [SendGrid](https://signup.sendgrid.com/)
2. Navigate to Settings → API Keys
3. Create a new API key with "Mail Send" permissions
4. Copy the key (starts with `SG.`)

### 2. Installation

SendGrid SDK is already installed:
```bash
pnpm add @sendgrid/mail
```

### 3. Architecture

**MailerService** (`src/mailer/mailer.service.ts`)
- Wraps SendGrid client
- Provides `sendInviteEmail()` method
- Generates responsive HTML email template
- Logs email delivery status

**AdminController** (`src/admin/admin.controller.ts`)
- Enhanced invite endpoint: `POST /organization/:orgId/admin/invite`
- Fetches organization and inviter details
- Builds invite URL: `${APP_URL}/invite/accept?token=${token}`
- Sends email via MailerService
- Returns debug info if `INVITE_EMAIL_DEV_ECHO=true`

### 4. Email Template

The HTML template includes:
- Organization name and inviter name
- Big "Accept invite" CTA button
- Fallback plain-text link
- Responsive design (mobile-friendly)
- Professional styling with Tailwind colors

### 5. Error Handling

If email delivery fails:
- Error is logged but doesn't block the response
- Admin can retry by listing invites and resending
- Invite token is still created in database

### 6. Development Mode

Set `INVITE_EMAIL_DEV_ECHO=true` to get debug info in API response:

```json
{
  "invite": { ... },
  "debug": {
    "token": "abc123...",
    "inviteUrl": "http://localhost:5173/invite/accept?token=abc123..."
  }
}
```

**Benefits:**
- Test invite flow without email delivery
- Copy invite URL directly from API response
- No SendGrid API key required for local dev

---

## Frontend - Invite Pages

### 1. Components

**InviteAcceptPage** (`src/pages/InviteAcceptPage.jsx`)
- Reads token from URL query parameter
- Calls `GET /invite/check?token=...` to validate
- Shows organization name, description, and role
- Displays different UI based on auth state:
  - **Logged in:** Button to accept invite immediately
  - **Not logged in:** Registration form with pre-filled email

**RegisterWithInvite** (`src/components/RegisterWithInvite.jsx`)
- Reusable registration form
- Pre-fills email from invite
- Includes `inviteToken` in registration payload
- Server automatically creates org membership on success
- Redirects to dashboard after registration

### 2. Routing

Add to your React Router configuration:

```jsx
import InviteAcceptPage from './pages/InviteAcceptPage';

// In your router setup:
<Route path="/invite/accept" element={<InviteAcceptPage />} />
```

### 3. User Flows

**Flow 1: New User (Registration)**
1. User clicks invite link in email → `http://localhost:5173/invite/accept?token=abc123`
2. Frontend calls `GET /invite/check?token=abc123`
3. Shows registration form with pre-filled email
4. User enters password and name
5. Frontend calls `POST /auth/register` with `inviteToken` in body
6. Server creates user AND organization membership
7. User is logged in and redirected to dashboard

**Flow 2: Existing User (Direct Accept)**
1. User clicks invite link in email
2. User is already logged in (has JWT token)
3. Frontend shows "Join organization" button
4. User clicks button
5. Frontend calls `POST /invite/:token/accept`
6. Server validates token and email match
7. Creates organization membership
8. User redirected to dashboard

**Flow 3: Existing User (Login First)**
1. User clicks invite link in email
2. User is not logged in
3. User clicks "Already have an account? Login"
4. After login, redirect back to `/invite/accept?token=...`
5. Now logged in, shows "Join organization" button
6. Continue with Flow 2

### 4. Email Validation

**Security measure:** The server enforces that the invite email matches the user's email:

```typescript
// In acceptInvite()
if (invite.email !== userEmail) {
  throw new BadRequestException('Email mismatch');
}
```

This prevents invite hijacking where someone forwards an invite link to another person.

---

## Testing

### 1. Development Testing (without email)

**Step 1:** Set environment variable
```env
INVITE_EMAIL_DEV_ECHO=true
```

**Step 2:** Create an invite via API
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
$body = @{
    email = "newuser@example.com"
    roleKey = "member"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/organization/$orgId/admin/invite" `
    -Method Post -Headers $headers -Body $body -ContentType "application/json"

# Response includes debug info:
Write-Host "Invite URL: $($result.debug.inviteUrl)"
```

**Step 3:** Copy the invite URL and open in browser
```
http://localhost:5173/invite/accept?token=abc123...
```

**Step 4:** Test both flows:
- Register new account with invite
- Login with existing account and accept

### 2. Production Testing (with SendGrid)

**Step 1:** Configure SendGrid
```env
SENDGRID_API_KEY=SG.real_key_here
MAIL_FROM=YourApp <no-reply@yourdomain.com>
INVITE_EMAIL_DEV_ECHO=false
```

**Step 2:** Verify sender identity
- SendGrid requires sender verification
- Go to Settings → Sender Authentication
- Verify your domain or single sender email

**Step 3:** Create invite
```powershell
# Same as above - email will be sent automatically
```

**Step 4:** Check email delivery
- Check recipient inbox (and spam folder)
- Monitor SendGrid Activity Feed: https://app.sendgrid.com/email_activity

**Step 5:** Test invite acceptance
- Click link in email
- Complete registration or acceptance
- Verify user appears in organization members list

### 3. Test Script

**test-invite-email.ps1**
```powershell
# Test invite creation with email delivery
$baseUrl = "http://localhost:3001"
$token = "your_jwt_token_here"
$orgId = "your_org_id_here"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Create invite
Write-Host "Creating invite..."
$inviteBody = @{
    email = "test@example.com"
    roleKey = "member"
} | ConvertTo-Json

$invite = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invite" `
    -Method Post -Headers $headers -Body $inviteBody

Write-Host "Invite created successfully"
if ($invite.debug) {
    Write-Host "Debug URL: $($invite.debug.inviteUrl)"
}

# Check invite status
Write-Host "`nChecking invite token..."
$checkUrl = "$baseUrl/invite/check?token=$($invite.debug.token)"
$inviteInfo = Invoke-RestMethod -Uri $checkUrl -Method Get

Write-Host "Invite valid for: $($inviteInfo.email)"
Write-Host "Organization: $($inviteInfo.organization.name)"
Write-Host "Role: $($inviteInfo.roleKey)"
```

### 4. Email Preview

To preview email content without sending:

```typescript
// In MailerService
const html = this.composeInviteHtml(
  'http://localhost:5173/invite/accept?token=demo123',
  'Alice Johnson',
  'Acme Inc.'
);
console.log(html); // Copy and paste into HTML file to preview
```

---

## Production Configuration

### 1. Environment Variables

**Production .env**
```env
# Use production URLs
APP_URL=https://app.yourdomain.com
API_URL=https://api.yourdomain.com
WEB_URL=https://www.yourdomain.com

# Production SendGrid key
SENDGRID_API_KEY=SG.production_key_here
MAIL_FROM=YourApp <no-reply@yourdomain.com>

# Disable debug mode
INVITE_EMAIL_DEV_ECHO=false

# Production Stripe keys
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_production_secret
```

### 2. Domain Verification

**SendGrid Domain Authentication:**
1. Go to Settings → Sender Authentication → Domain Authentication
2. Follow DNS configuration steps
3. Verify domain ownership
4. Improves email deliverability and removes "via SendGrid" label

### 3. Email Templates

For production, consider:
- Custom HTML templates with your branding
- Logo and colors matching your app
- Unsubscribe links (SendGrid requirement for some plans)
- Plain-text alternative for email clients that don't support HTML

### 4. Monitoring

**SendGrid Dashboard:**
- Monitor delivery rates
- Track bounces and spam reports
- View email activity feed
- Set up alerts for delivery issues

**Application Logging:**
- Log invite creation events
- Log email send successes/failures
- Track invite acceptance rate
- Monitor expired invites

### 5. Rate Limiting

**SendGrid Free Tier:** 100 emails/day

For higher volume:
- Upgrade SendGrid plan
- Implement invite rate limiting per organization
- Add cooldown period between invites to same email

### 6. Security Checklist

- [x] Token is 32 bytes (256 bits) of random data
- [x] Token expires after 7 days
- [x] Email matching enforced (invite.email === user.email)
- [x] Tokens are single-use (marked as used after acceptance)
- [x] HTTPS required in production (APP_URL must use https://)
- [x] SendGrid API key stored in environment variable (never in code)
- [x] CORS configured to allow only your frontend domain

---

## API Reference

### Create Invite

**Endpoint:** `POST /organization/:organizationId/admin/invite`

**Auth:** JWT Bearer token, requires 'owner' or 'admin' role

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "roleKey": "member"  // Optional, defaults to "member"
}
```

**Response (Dev Mode):**
```json
{
  "invite": {
    "id": "...",
    "email": "newuser@example.com"
  },
  "debug": {
    "token": "abc123...",
    "inviteUrl": "http://localhost:5173/invite/accept?token=abc123..."
  }
}
```

**Response (Production):**
```json
{
  "ok": true,
  "invite": {
    "id": "...",
    "email": "newuser@example.com"
  }
}
```

### Check Invite

**Endpoint:** `GET /invite/check?token=...`

**Auth:** None (public endpoint)

**Response:**
```json
{
  "email": "newuser@example.com",
  "roleKey": "member",
  "expiresAt": "2025-11-15T12:00:00Z",
  "organization": {
    "id": "...",
    "name": "Acme Inc.",
    "description": "Enterprise workspace"
  }
}
```

### Accept Invite (Logged In)

**Endpoint:** `POST /invite/:token/accept`

**Auth:** JWT Bearer token

**Response:**
```json
{
  "ok": true,
  "membership": {
    "userId": "...",
    "organizationId": "...",
    "roleKey": "member"
  }
}
```

### Register with Invite

**Endpoint:** `POST /auth/register`

**Auth:** None

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "inviteToken": "abc123..."  // Optional
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "...",
    "email": "newuser@example.com",
    "name": "John Doe"
  }
}
```

---

## Troubleshooting

### Email Not Received

**Check SendGrid Activity Feed:**
1. Go to https://app.sendgrid.com/email_activity
2. Search for recipient email
3. Check delivery status and error messages

**Common Issues:**
- Invalid API key → Check `SENDGRID_API_KEY` in .env
- Unverified sender → Complete sender authentication
- Recipient spam filter → Check spam folder
- Invalid recipient email → Validate email format
- Rate limit exceeded → Check SendGrid quota

### Invite Token Invalid

**Possible Causes:**
- Token expired (>7 days old)
- Token already used
- Token doesn't exist in database
- Database connection issue

**Debug Steps:**
```sql
-- Check invite in database
SELECT * FROM "InviteToken" WHERE token = 'abc123...';

-- Check expiry
SELECT token, email, "expiresAt", "usedAt" 
FROM "InviteToken" 
WHERE token = 'abc123...'
AND "expiresAt" > NOW()
AND "usedAt" IS NULL;
```

### Email Mismatch Error

**Scenario:** User tries to accept invite but email doesn't match

**Solution:**
- Invite was sent to `alice@example.com`
- User must register/login with `alice@example.com`
- Cannot use different email for security reasons

**To allow different email:**
- Admin must create a new invite for the different email
- Or admin can update user's email in database first

### Frontend 404 on Invite Page

**Check:**
- Route is registered: `/invite/accept`
- Component is imported correctly
- React Router is configured properly

**Test:**
```bash
# Direct navigation should work
http://localhost:5173/invite/accept?token=test123
```

---

## Next Steps

1. **Implement Resend Invite:** Add endpoint to resend email for pending invites
2. **Invite Expiry Notifications:** Warn admins about invites expiring soon
3. **Bulk Invites:** Allow CSV upload to invite multiple users
4. **Custom Email Templates:** Use SendGrid Dynamic Templates for better branding
5. **Email Preferences:** Let users opt-out of certain notifications
6. **Invite Analytics:** Track acceptance rates and time-to-acceptance

---

## Summary

✅ **Backend Complete:**
- MailerService with SendGrid integration
- Email sending on invite creation
- Responsive HTML email template
- Dev mode for testing without emails

✅ **Frontend Complete:**
- InviteAcceptPage for accepting invites
- RegisterWithInvite component
- Support for both new and existing users
- Email validation and error handling

✅ **Production Ready:**
- Environment variable configuration
- Security measures (email matching, token expiry)
- Error handling and logging
- SendGrid sender verification

**Time to test!** Create an invite and see the email in action. 🚀
