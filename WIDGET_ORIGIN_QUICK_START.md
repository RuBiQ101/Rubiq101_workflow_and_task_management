# Widget Origin Restrictions - Quick Start

## ✅ All Implementation Complete!

All 8 steps from your specification have been successfully implemented.

---

## 🚀 Quick Test (5 minutes)

### 1. Start Your Services

```powershell
# Terminal 1: Start API
cd "c:\My Projects\Workflow management\workflow-platform\apps\api"
npm run start:dev

# Terminal 2: Start Web
cd "c:\My Projects\Workflow management\workflow-platform\apps\web"
npm run dev
```

### 2. Create a Page Token

1. Open http://localhost:5173
2. Log in to your dashboard
3. Navigate to **Organization Settings → Widgets**
4. Click **"Create Token"**
5. Set **Allowed Origins**: `http://localhost:5500`
6. **Copy the token** (shown only once!)

### 3. Test the Widget

```powershell
# Update test-widget.html with your token
# Replace YOUR_PAGE_TOKEN_HERE with the actual token

# Serve the test page
cd "c:\My Projects\Workflow management\workflow-platform"
npx http-server -p 5500
```

4. Open http://localhost:5500/test-widget.html
5. Widget should appear in bottom-right corner ✅

### 4. Test Origin Restriction

```powershell
# Serve from different port (should fail)
npx http-server -p 8080
```

Open http://localhost:8080/test-widget.html
- Should get **403 Forbidden** error ❌
- Check browser console for error details

---

## 📋 What Was Implemented

### Backend Changes

1. **✅ Database Schema** (`schema.prisma`)
   - Changed `allowedOrigins` from `String?` to `String[]` (native array)
   - Migration run successfully: `20251108114636_page_token_allowed_origins`

2. **✅ Widget Service** (`widget.service.ts`)
   - Origin header normalization (handles Origin and Referer)
   - Wildcard subdomain matching (`*.example.com`)
   - Strict validation with proper error messages
   - Native array support (no JSON parsing)

3. **✅ Widget Controller** (`widget.controller.ts`)
   - Passes origin headers to service
   - Type-safe origin extraction

4. **✅ DTO Created** (`create-page-token.dto.ts`)
   - Validation with class-validator
   - Type-safe allowed origins

5. **✅ Admin Controller** (`widget-admin.controller.ts`)
   - Uses DTO for validation
   - Normalizes origins (trim whitespace)

### Frontend Changes

6. **✅ Admin UI** (`PageTokensAdmin.jsx`)
   - Works with native arrays
   - Shows origin restriction badge
   - Lists all allowed origins
   - Comma-separated input

### Build & Deploy

7. **✅ Widget Build Config** (`vite.widget.config.js`)
   - IIFE bundle format
   - Minified for production
   - Build script: `npm run build:widget`

8. **✅ GitHub Actions** (`.github/workflows/publish-widget.yml`)
   - Auto-build on push to main
   - Upload to S3 with versioning
   - CloudFront invalidation

### Testing & Documentation

9. **✅ Test Page** (`test-widget.html`)
   - Complete setup instructions
   - Testing scenarios
   - Debugging tips

10. **✅ Documentation** (`ORIGIN_RESTRICTIONS_IMPLEMENTATION.md`)
    - Complete implementation details
    - Testing guide
    - Security recommendations
    - Deployment checklist

---

## 🔒 Security Examples

### Exact Match (Recommended for Production)
```javascript
// Token config in admin UI
allowedOrigins: ["https://example.com", "https://www.example.com"]

// Widget works on:
✅ https://example.com
✅ https://www.example.com
❌ https://app.example.com (not in list)
❌ http://example.com (wrong protocol)
```

### Wildcard Subdomains (Use with Caution)
```javascript
// Token config
allowedOrigins: ["*.example.com"]

// Widget works on:
✅ https://app.example.com
✅ https://staging.example.com
✅ https://anything.example.com
❌ https://example.com (doesn't match wildcard)
❌ https://evil.com (different domain)
```

### No Restrictions (Development Only!)
```javascript
// Token config
allowedOrigins: []

// Widget works on:
✅ Any origin (use only for development/testing)
```

---

## 📊 Verify Implementation

### Check Database
```sql
-- Verify migration
SELECT * FROM page_token LIMIT 1;

-- Should show allowed_origins as text[] (array type)
```

### Test API Endpoint
```powershell
# Valid origin (should work)
curl -X POST "http://localhost:3001/widget/session" `
  -H "Content-Type: application/json" `
  -H "Origin: http://localhost:5500" `
  -d '{"pageToken":"YOUR_TOKEN_HERE"}'

# Expected: {"jwt":"...","orgId":"...","expiresIn":300}

# Invalid origin (should fail)
curl -X POST "http://localhost:3001/widget/session" `
  -H "Content-Type: application/json" `
  -H "Origin: http://evil-site.com" `
  -d '{"pageToken":"YOUR_TOKEN_HERE"}'

# Expected: 403 Forbidden
```

---

## 📝 Files Created/Modified

### Created Files
```
✅ apps/api/src/widget/dto/create-page-token.dto.ts
✅ apps/web/vite.widget.config.js
✅ .github/workflows/publish-widget.yml
✅ test-widget.html
✅ ORIGIN_RESTRICTIONS_IMPLEMENTATION.md
✅ WIDGET_ORIGIN_QUICK_START.md (this file)
```

### Modified Files
```
✅ apps/api/prisma/schema.prisma
✅ apps/api/src/widget/widget.service.ts
✅ apps/api/src/widget/widget.controller.ts
✅ apps/api/src/widget/widget-admin.controller.ts
✅ apps/web/src/components/PageTokensAdmin.jsx
✅ apps/web/package.json
```

---

## 🎯 Production Deployment

### 1. Build Widget Bundle
```powershell
cd apps/web
npm run build:widget
```
Output: `dist/widget/workflo-widget-app.iife.js`

### 2. Upload to S3
```powershell
aws s3 cp dist/widget/workflo-widget-app.iife.js `
  s3://YOUR_BUCKET/workflo-widget-app.iife.js `
  --acl public-read `
  --cache-control max-age=31536000 `
  --content-type application/javascript
```

### 3. Set GitHub Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
WIDGET_S3_BUCKET
CLOUDFRONT_DISTRIBUTION_ID (optional)
```

### 4. Deploy Backend
```powershell
cd apps/api
npx prisma migrate deploy  # Apply migration to production DB
npm run build
npm run start:prod
```

---

## ✅ Security Checklist

Production tokens should:
- [ ] Have `allowedOrigins` configured (never empty in production)
- [ ] Use HTTPS origins only (no HTTP except localhost for dev)
- [ ] Be as specific as possible (exact domains, not wildcards)
- [ ] Be stored securely (environment variables, not committed to Git)
- [ ] Be rotated periodically (e.g., every 90 days)
- [ ] Be monitored in activity logs for suspicious usage

---

## 🐛 Troubleshooting

### Widget doesn't load
1. **Check browser console** for errors
2. **Verify token** is correct (not revoked)
3. **Check origin** matches allowed list
4. **Verify API** is running and accessible
5. **Check CORS** settings if cross-origin

### 403 Forbidden error
- Origin not in `allowedOrigins` list
- Check exact format: `https://example.com` (with protocol)
- Wildcard might not match correctly
- Browser might be sending different origin

### Widget loads but doesn't work
- Check JWT expiration (should auto-refresh)
- Verify WebSocket connection
- Check organization ID in JWT
- Review API logs for errors

---

## 📞 Support

For issues or questions:
1. Check `ORIGIN_RESTRICTIONS_IMPLEMENTATION.md` for detailed docs
2. Review `test-widget.html` for testing examples
3. Check `WIDGET_INTEGRATION.md` for customer-facing docs
4. Review activity logs in database

---

## 🎉 You're Done!

The widget system now has production-grade origin restrictions:
- ✅ Database schema updated
- ✅ Backend validation implemented
- ✅ Frontend UI supports origin management
- ✅ Build and deployment automation ready
- ✅ Testing tools provided
- ✅ Documentation complete

**Next:** Test locally, then deploy to production! 🚀
