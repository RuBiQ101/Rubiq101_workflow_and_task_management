# Usage Logging & Email Notifications - Implementation Summary

## ✅ All Features Implemented

Successfully implemented usage logging and first-time origin email notifications for the widget system.

---

## 🎯 Implementation Overview

### Feature A: PageTokenUsage Logging

**Purpose:** Track every widget session request with detailed audit trail including origin, IP address, and user-agent.

**Database Model:**
```prisma
model PageTokenUsage {
  id          String    @id @default(cuid())
  pageTokenId String
  origin      String
  ip          String?   // requestor IP
  userAgent   String?   // browser UA
  createdAt   DateTime  @default(now())

  pageToken   PageToken @relation(fields: [pageTokenId], references: [id], onDelete: Cascade)

  @@index([pageTokenId])
  @@index([origin])
}
```

**Migration:** ✅ Applied
```bash
Migration: 20251108120128_page_token_usage_logging
Status: Successfully applied
```

---

### Feature B: First-Time Origin Email Notifications

**Purpose:** Automatically notify organization admins when a page token is used from a new origin for the first time.

**How It Works:**
1. Widget session is requested from origin (e.g., `https://example.com`)
2. Usage is logged to `PageTokenUsage` table
3. System checks if this origin has been seen before for this token
4. If first time (`count === 1`), emails are sent to all org owners/admins
5. Email includes origin, IP, user-agent, timestamp, and management link

**Email Recipients:**
- Organization owners (`roleKey: 'owner'`)
- Organization admins (`roleKey: 'admin'`)

**Email Content:**
```html
Subject: [Workflo] New widget usage from https://example.com

Body:
- Token description/ID
- Origin (full URL with protocol and port)
- IP address (from X-Forwarded-For or socket)
- User-Agent string
- Timestamp
- Link to manage page tokens
```

---

## 📁 Files Modified

### 1. Prisma Schema
**File:** `apps/api/prisma/schema.prisma`

**Changes:**
- Added `PageTokenUsage` model with relation to `PageToken`
- Added `usageLogs` relation to `PageToken` model
- Indexes on `pageTokenId` and `origin` for query performance

### 2. Widget Service
**File:** `apps/api/src/widget/widget.service.ts`

**Changes:**
- Added `Logger` from `@nestjs/common`
- Added `MailerService` import and injection
- Updated `createWidgetSession()` method signature:
  - Added `ip?: string` parameter
  - Added `userAgent?: string` parameter
- Enhanced session creation logic:
  - Logs usage attempt (even for denied origins)
  - Creates `PageTokenUsage` record for every request
  - Counts existing usage for origin
  - Sends email on first-time origin usage
  - Error handling with logging (non-blocking)

**Key Logic:**
```typescript
// Create usage record
await this.prisma.pageTokenUsage.create({
  data: {
    pageTokenId: rec.id,
    origin: origin ?? 'unknown',
    ip: ip ?? null,
    userAgent: userAgent ?? null,
  },
});

// Check if first time
const existingCount = await this.prisma.pageTokenUsage.count({
  where: { pageTokenId: rec.id, origin: origin ?? 'unknown' },
});

// Notify if first usage (count === 1)
if (existingCount === 1) {
  // Find admins and send emails
}
```

### 3. Widget Controller
**File:** `apps/api/src/widget/widget.controller.ts`

**Changes:**
- Extract IP address from `X-Forwarded-For` header (proxy-aware)
- Fallback to `req.connection.remoteAddress` or `req.socket.remoteAddress`
- Extract `User-Agent` header
- Pass IP and user-agent to `createWidgetSession()`

**IP Extraction Logic:**
```typescript
const ip = req.headers['x-forwarded-for']
  ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
  : req.connection?.remoteAddress || req.socket?.remoteAddress;
```

### 4. Widget Module
**File:** `apps/api/src/widget/widget.module.ts`

**Changes:**
- Imported `MailerModule`
- Added to `imports` array
- Makes `MailerService` available to `WidgetService`

### 5. GitHub Actions Workflow
**File:** `.github/workflows/publish-widget.yml`

**Changes:**
- Added **CloudFront Invalidation** step:
  - Conditional on `WIDGET_CLOUDFRONT_DISTRIBUTION_ID` variable
  - Invalidates `/workflo-widget-app.iife.js` and `/workflo-widget-v1.js`
  
- Added **Smoke Test** step:
  - Calls `POST /widget/session` with test token
  - Sets `Origin: https://smoke.test.example` header
  - Validates HTTP 200/201 response
  - Checks for `"jwt"` in response body
  - Fails build if test fails

**New Secrets Required:**
```yaml
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
WIDGET_S3_BUCKET
WIDGET_API_BASE              # e.g., https://api.yourapp.com
WIDGET_SMOKE_PAGE_TOKEN      # Test token for smoke test
```

**New Variables:**
```yaml
WIDGET_CLOUDFRONT_DISTRIBUTION_ID  # Optional, for CDN invalidation
```

---

## 🔒 Security Features

### Audit Trail
Every widget session request is logged with:
- ✅ Page token ID
- ✅ Origin (normalized URL)
- ✅ IP address (proxy-aware)
- ✅ User-agent string
- ✅ Timestamp

### Suspicious Activity Detection
Failed origin validations are also logged:
```typescript
// Log suspicious attempt even when denied
await this.prisma.pageTokenUsage.create({ ... });
throw new ForbiddenException('Origin not allowed');
```

### Admin Notifications
Proactive security monitoring:
- Immediate email notification on first-time origin usage
- Admins can quickly identify unauthorized usage
- Direct link to revoke tokens or adjust allowed origins

---

## 📊 Usage Analytics Queries

### Track All Widget Sessions
```sql
SELECT 
  pt.description,
  pt.token,
  ptu.origin,
  ptu.ip,
  COUNT(*) as session_count,
  MAX(ptu.created_at) as last_used
FROM page_token_usage ptu
JOIN page_token pt ON pt.id = ptu.page_token_id
GROUP BY pt.id, ptu.origin, ptu.ip
ORDER BY session_count DESC;
```

### Find First-Time Origins
```sql
SELECT 
  pt.description,
  ptu.origin,
  MIN(ptu.created_at) as first_seen,
  ptu.ip,
  ptu.user_agent
FROM page_token_usage ptu
JOIN page_token pt ON pt.id = ptu.page_token_id
GROUP BY pt.id, ptu.origin, ptu.ip, ptu.user_agent
ORDER BY first_seen DESC;
```

### Detect Suspicious Activity
```sql
-- Multiple IPs from same origin (possible proxy/bot)
SELECT 
  origin,
  COUNT(DISTINCT ip) as unique_ips,
  COUNT(*) as total_requests
FROM page_token_usage
WHERE created_at >= NOW() - INTERVAL '1 day'
GROUP BY origin
HAVING COUNT(DISTINCT ip) > 10
ORDER BY total_requests DESC;
```

### Token Usage by Time
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as sessions,
  COUNT(DISTINCT origin) as unique_origins,
  COUNT(DISTINCT ip) as unique_ips
FROM page_token_usage
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

---

## 🧪 Testing Guide

### Test Email Notifications

**Step 1: Create Test Token**
```bash
# Log in to http://localhost:5173
# Navigate to Organization Settings → Widgets
# Create token with description "Test Token"
# Set allowedOrigins: ["http://localhost:5500"]
# Copy the token
```

**Step 2: Trigger First-Time Usage**
```bash
# Update test-widget.html with token
# Serve from port 5500
npx http-server -p 5500

# Open http://localhost:5500/test-widget.html
# Widget loads and creates session
# Check email for notification ✅
```

**Step 3: Verify Email Not Sent Again**
```bash
# Refresh the page
# Widget loads again
# NO email sent (origin already seen) ✅
```

**Step 4: Test Different Origin**
```bash
# Serve from different port
npx http-server -p 8080

# Update token allowedOrigins: ["http://localhost:5500", "http://localhost:8080"]
# Open http://localhost:8080/test-widget.html
# New email sent for this origin ✅
```

### Verify Usage Logging

**Check Database:**
```sql
-- View recent usage
SELECT * FROM page_token_usage
ORDER BY created_at DESC
LIMIT 20;

-- Count by origin
SELECT origin, COUNT(*) 
FROM page_token_usage 
GROUP BY origin;
```

### Test Smoke Test in CI

**Local Test:**
```bash
# Set environment variables
export API_BASE="http://localhost:3001"
export PAGE_TOKEN="your_test_token_here"

# Run smoke test
curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_BASE/widget/session" \
  -H "Content-Type: application/json" \
  -H "Origin: https://smoke.test.example" \
  -d "{\"pageToken\":\"$PAGE_TOKEN\"}" | grep -q '"jwt"' && echo "✅ PASS" || echo "❌ FAIL"
```

---

## 🚀 Deployment Checklist

### Backend Deployment

- [x] ✅ Run Prisma migration: `npx prisma migrate deploy`
- [x] ✅ Verify `page_token_usage` table exists
- [x] ✅ Verify `MailerModule` imported in `WidgetModule`
- [ ] Configure SendGrid API key in production env
- [ ] Set `APP_URL` environment variable
- [ ] Test email delivery in production

### GitHub Actions Setup

- [ ] Add GitHub secrets:
  - `WIDGET_API_BASE` (e.g., `https://api.yourapp.com`)
  - `WIDGET_SMOKE_PAGE_TOKEN` (create test token)
- [ ] Add GitHub variable (optional):
  - `WIDGET_CLOUDFRONT_DISTRIBUTION_ID`
- [ ] Create smoke test page token:
  ```
  Description: "CI Smoke Test"
  allowedOrigins: ["https://smoke.test.example"]
  ```
- [ ] Test workflow with manual trigger
- [ ] Verify smoke test passes

### Monitoring Setup

- [ ] Set up log aggregation for `WidgetService` logs
- [ ] Create alert for failed email notifications
- [ ] Create dashboard for widget usage metrics
- [ ] Set up alert for suspicious activity (many failed origins)

---

## 📧 Email Notification Examples

### Success Email (First-Time Origin)

**Subject:** [Workflo] New widget usage from https://example.com

**Body:**
```
New Widget Usage Detected

Hello —

Your page token Marketing Website was used for the first time from this origin:

• Origin: https://example.com
• IP: 203.0.113.42
• User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
• Time: 2025-11-08T12:01:28.000Z

If this is expected, no action is needed. If this looks suspicious you can 
revoke the token or limit its allowed origins.

[Manage Page Tokens Button]

Sent by https://yourapp.com
```

### No Email Sent (Subsequent Usage)

When widget is used again from the same origin, NO email is sent. This prevents notification fatigue while still maintaining complete audit logs in the database.

---

## 🎉 Summary

All features successfully implemented:

1. ✅ **PageTokenUsage Model** - Comprehensive audit logging
2. ✅ **Usage Tracking** - Every session logged with origin, IP, UA
3. ✅ **Email Notifications** - First-time origin alerts to admins
4. ✅ **MailerService Integration** - Email delivery via SendGrid
5. ✅ **Controller Updates** - IP and user-agent extraction
6. ✅ **CloudFront Invalidation** - CDN cache clearing in CI/CD
7. ✅ **Smoke Tests** - Automated endpoint validation in CI/CD

**Ready for production!** 🚀

---

## 📚 Related Documentation

- `WIDGET_INTEGRATION.md` - Customer-facing integration guide
- `ORIGIN_RESTRICTIONS_IMPLEMENTATION.md` - Origin security implementation
- `test-widget.html` - Interactive testing page
- `.github/workflows/publish-widget.yml` - CI/CD pipeline

---

## 💡 Future Enhancements

Consider adding:
- Rate limiting per token/origin
- Geographic restrictions based on IP
- Usage quotas per token
- Real-time usage dashboard
- Webhook notifications (alternative to email)
- Anomaly detection (ML-based)
- Token expiration dates
- Usage reports (daily/weekly summaries)
