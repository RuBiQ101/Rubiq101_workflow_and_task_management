# Widget System - Quick Setup Guide

## 🚀 Quick Setup Checklist

### Backend Configuration

```bash
# 1. Run migrations
cd apps/api
npx prisma migrate deploy

# 2. Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="your-secret-key"
export SENDGRID_API_KEY="SG...."
export MAIL_FROM="no-reply@yourapp.com"
export APP_URL="https://yourapp.com"

# 3. Start backend
npm run start:dev
```

### GitHub Actions Setup

Add these secrets in **GitHub → Settings → Secrets and variables → Actions**:

**Required Secrets:**
```yaml
AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
AWS_REGION: "us-east-1"
WIDGET_S3_BUCKET: "your-widget-bucket"
WIDGET_API_BASE: "https://api.yourapp.com"
WIDGET_SMOKE_PAGE_TOKEN: "your-test-token-here"
```

**Optional Variables:**
```yaml
WIDGET_CLOUDFRONT_DISTRIBUTION_ID: "E1234567890ABC"
```

### Create Smoke Test Token

```bash
# 1. Log into your app
# 2. Create a page token with:
#    - Description: "CI Smoke Test"
#    - allowedOrigins: ["https://smoke.test.example"]
# 3. Copy token and add to GitHub secrets as WIDGET_SMOKE_PAGE_TOKEN
```

---

## 📊 Usage Analytics Dashboard

### Quick Queries

**Recent usage:**
```sql
SELECT * FROM page_token_usage 
ORDER BY created_at DESC 
LIMIT 50;
```

**Usage by origin:**
```sql
SELECT origin, COUNT(*) as count
FROM page_token_usage
GROUP BY origin
ORDER BY count DESC;
```

**First-time origins today:**
```sql
SELECT DISTINCT ON (page_token_id, origin)
  pt.description,
  ptu.origin,
  ptu.created_at,
  ptu.ip
FROM page_token_usage ptu
JOIN page_token pt ON pt.id = ptu.page_token_id
WHERE ptu.created_at >= CURRENT_DATE
ORDER BY page_token_id, origin, created_at ASC;
```

---

## 🧪 Testing Checklist

- [ ] Create test token with allowed origin
- [ ] Open test-widget.html from allowed origin
- [ ] Verify widget loads
- [ ] Check email notification received
- [ ] Refresh page - verify no duplicate email
- [ ] Check `page_token_usage` table has records
- [ ] Test from disallowed origin - verify 403 error
- [ ] Verify failed attempt is logged
- [ ] Test smoke test locally with curl
- [ ] Trigger GitHub Action and verify success

---

## 🔍 Monitoring

### Key Metrics to Track

1. **Widget Sessions** - Total sessions created per day
2. **Unique Origins** - New domains using widgets
3. **Failed Attempts** - 403 Forbidden errors (suspicious activity)
4. **Email Delivery** - Success/failure rates
5. **Response Time** - `/widget/session` endpoint latency

### Log Queries

**Find failed email notifications:**
```bash
# Check application logs for:
grep "Failed to notify admin via email" app.log
```

**Find suspicious activity:**
```sql
-- Origins with high 403 rate
SELECT origin, COUNT(*) as failed_attempts
FROM page_token_usage
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND (/* join with failed auth logs */)
GROUP BY origin
HAVING COUNT(*) > 10;
```

---

## 📧 Email Notification Settings

### SendGrid Configuration

```typescript
// Already configured in apps/api/src/mailer/mailer.service.ts
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Set sender email
MAIL_FROM=no-reply@yourapp.com
```

### Email Template Customization

To customize the notification email, edit the HTML in `apps/api/src/widget/widget.service.ts`:

```typescript
// Line ~180 in createWidgetSession method
const html = `
  <div style="font-family:Arial,sans-serif;">
    <!-- Customize your email template here -->
  </div>
`;
```

---

## 🚨 Troubleshooting

### Widget Session Fails

**Error:** `Origin not allowed for this token`
**Solution:** Add origin to `allowedOrigins` in token settings

**Error:** `Invalid or revoked page token`
**Solution:** Check token is not revoked; create new token if needed

### Email Not Received

**Check:**
1. SendGrid API key is valid
2. `MAIL_FROM` is verified in SendGrid
3. Check WidgetService logs for email errors
4. Verify org has admin/owner members with emails
5. Check spam folder

### Smoke Test Fails

**Error:** `no jwt in response body`
**Possible causes:**
- API_BASE incorrect
- PAGE_TOKEN invalid or revoked
- Origin not in allowedOrigins
- Backend not running

**Debug:**
```bash
# Test manually
curl -X POST "https://api.yourapp.com/widget/session" \
  -H "Content-Type: application/json" \
  -H "Origin: https://smoke.test.example" \
  -d '{"pageToken":"YOUR_TOKEN"}' \
  -v
```

### CloudFront Invalidation Fails

**Check:**
- `WIDGET_CLOUDFRONT_DISTRIBUTION_ID` is correct
- AWS credentials have CloudFront permissions
- Distribution is associated with S3 bucket

---

## 🎯 Production Deployment Steps

1. **Backend:**
   ```bash
   # Run migrations
   npx prisma migrate deploy
   
   # Start backend
   pm2 start npm --name "api" -- run start:prod
   ```

2. **Frontend Widget:**
   ```bash
   # Build widget
   cd apps/web
   npm run build:widget
   
   # Upload to S3 (or use GitHub Actions)
   aws s3 cp dist/widget/workflo-widget-app.iife.js \
     s3://your-bucket/workflo-widget-app.iife.js
   ```

3. **Verify:**
   - Create test token
   - Test on staging domain
   - Check usage logs
   - Verify email notifications
   - Test smoke test endpoint

4. **Monitor:**
   - Check CloudWatch/application logs
   - Monitor email delivery rates
   - Track widget usage metrics
   - Set up alerts for errors

---

## 📋 Required Environment Variables

### Backend (apps/api)

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# JWT
JWT_SECRET="your-secret-key-here"

# SendGrid (Email)
SENDGRID_API_KEY="SG.xxxx"
MAIL_FROM="no-reply@yourapp.com"

# App URL (for email links)
APP_URL="https://yourapp.com"
```

### GitHub Actions

```yaml
# AWS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

# Widget deployment
WIDGET_S3_BUCKET
WIDGET_CLOUDFRONT_DISTRIBUTION_ID (optional)

# Smoke testing
WIDGET_API_BASE
WIDGET_SMOKE_PAGE_TOKEN
```

---

## 📞 Support & Resources

- **Documentation:** `/USAGE_LOGGING_IMPLEMENTATION.md`
- **Integration Guide:** `/WIDGET_INTEGRATION.md`
- **Origin Security:** `/ORIGIN_RESTRICTIONS_IMPLEMENTATION.md`
- **Test Page:** `/test-widget.html`
- **GitHub Actions:** `/.github/workflows/publish-widget.yml`

---

## ✅ Implementation Status

- [x] PageTokenUsage database model
- [x] Usage logging on every session
- [x] First-time origin email notifications
- [x] IP and user-agent tracking
- [x] MailerService integration
- [x] CloudFront invalidation in CI/CD
- [x] Smoke test in CI/CD
- [x] Comprehensive documentation

**Status:** ✅ Production Ready!
