# Widget System - Origin Restrictions Implementation

## ✅ Implementation Complete

All 8 steps from your specification have been successfully implemented:

### 1. ✅ Prisma Schema Updated

**File:** `apps/api/prisma/schema.prisma`

```prisma
model PageToken {
  id             String    @id @default(cuid())
  orgId          String
  token          String    @unique
  description    String?
  allowedOrigins String[]  @default([]) // Now a native PostgreSQL array
  createdBy      String?
  createdAt      DateTime  @default(now())
  revoked        Boolean   @default(false)
  revokedAt      DateTime?
  
  @@index([orgId])
  @@index([token])
}
```

**Migration:** ✅ Run successfully
```
Migration: 20251108114636_page_token_allowed_origins
Status: Applied
```

---

### 2. ✅ Widget Service - Origin Enforcement

**File:** `apps/api/src/widget/widget.service.ts`

**Changes:**
- Added `ForbiddenException` import
- Added `URL` import from 'url'
- Updated `createWidgetSession()` method with:
  - Origin header normalization (handles both Origin and Referer headers)
  - Full URL parsing for Referer header
  - Wildcard subdomain matching (`*.example.com`)
  - Strict origin validation when `allowedOrigins` is configured
  - Proper error messages (`403 Forbidden` for origin mismatches)

**Origin Matching Logic:**
```typescript
// Exact match
origin === o  // "https://example.com" === "https://example.com"

// Wildcard match
if (o.startsWith('*.')) {
  const domain = o.slice(2);
  return origin.endsWith(domain);
}
// "https://app.example.com" matches "*.example.com"
```

---

### 3. ✅ Widget Controller Updated

**File:** `apps/api/src/widget/widget.controller.ts`

**Changes:**
```typescript
@Post('session')
async createSession(@Body() body: { pageToken: string }, @Req() req: any) {
  const origin = (req.headers.origin as string) || (req.headers.referer as string) || null;
  return this.widgetSvc.createWidgetSession(body.pageToken, origin);
}
```

Now properly passes origin header to service for validation.

---

### 4. ✅ Service Methods Updated

**File:** `apps/api/src/widget/widget.service.ts`

**Updated Methods:**

1. **`createPageToken()`**
   - Now accepts `allowedOrigins: string[] = []` (native array)
   - Stores directly to database (no JSON.stringify)

2. **`listPageTokens()`**
   - Returns tokens as-is (no JSON.parse needed)
   - Native array support

3. **`updatePageTokenOrigins()`**
   - Updates with native array (no JSON.stringify)

---

### 5. ✅ DTO Created

**File:** `apps/api/src/widget/dto/create-page-token.dto.ts`

```typescript
import { IsOptional, IsString, IsArray } from 'class-validator';

export class CreatePageTokenDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];
}
```

**Features:**
- Validates that allowedOrigins is an array
- Validates each element is a string
- Fully typed and validated with class-validator

---

### 6. ✅ Admin Controller Updated

**File:** `apps/api/src/widget/widget-admin.controller.ts`

**Changes:**
```typescript
import { CreatePageTokenDto } from './dto/create-page-token.dto';

@Post('page-tokens')
@Roles('owner', 'admin')
async createPageToken(
  @Param('organizationId') orgId: string,
  @Body() body: CreatePageTokenDto,
  @Req() req: any,
) {
  const normalizedOrigins = body.allowedOrigins?.map(o => o.trim()).filter(Boolean) || [];
  
  const result = await this.widgetSvc.createPageToken(
    orgId,
    body.description ?? null,
    normalizedOrigins,
    req.user?.id,
  );
  
  return {
    ...result,
    warning: 'Save this token securely. It will not be shown again.',
  };
}
```

**Features:**
- Uses DTO for validation
- Normalizes origins (trim whitespace)
- No more JSON parsing/stringifying

---

### 7. ✅ Admin UI Updated

**File:** `apps/web/src/components/PageTokensAdmin.jsx`

**Changes:**
- Display works with native arrays (no parsing needed)
- Shows origin restriction badge when `allowedOrigins.length > 0`
- Lists all allowed origins in token details
- Create modal accepts comma-separated origins
- Origins are sent as array to API

**Features:**
- Visual indication of origin-restricted tokens
- Easy copy of embed code with token
- Supports comma-separated input: `https://example.com, *.subdomain.com`

---

### 8. ✅ Widget Build Configuration

**File:** `apps/web/vite.widget.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget/WidgetApp.jsx'),
      name: 'WorkfloWidgetApp',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'workflo-widget-app.iife.js',
      },
    },
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2019',
    outDir: 'dist/widget',
  },
});
```

**Build Script Added:**
```json
{
  "scripts": {
    "build:widget": "vite build --config vite.widget.config.js"
  }
}
```

**How to Build:**
```bash
cd apps/web
npm run build:widget
# Output: dist/widget/workflo-widget-app.iife.js
```

---

### 9. ✅ GitHub Actions Workflow

**File:** `.github/workflows/publish-widget.yml`

**Features:**
- Triggers on push to `main` (widget files only)
- Manual dispatch option
- Triggers on release publish
- Builds widget bundle
- Uploads to S3 with versioning
- CloudFront invalidation (optional)
- Creates GitHub Step Summary

**Required Secrets:**
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
WIDGET_S3_BUCKET
CLOUDFRONT_DISTRIBUTION_ID (optional)
```

**Workflow Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Build widget (`npm run build:widget`)
5. Upload to S3:
   - `workflo-widget-app.iife.js` (latest)
   - `workflo-widget-app.v{SHA}.iife.js` (versioned)
   - `workflo-widget-v1.js` (loader)
6. Invalidate CDN cache
7. Create summary

---

### 10. ✅ Test Page Created

**File:** `test-widget.html`

**Features:**
- Beautiful, styled test page
- Complete setup instructions
- Configuration display
- Testing scenarios for origin restrictions
- Debugging tips
- Sample content
- Console logging for debugging

**How to Use:**
```bash
# 1. Replace YOUR_PAGE_TOKEN_HERE in the file
# 2. Serve with local server
npx http-server -p 5500

# 3. Open in browser
http://localhost:5500/test-widget.html

# 4. Check console for logs
# 5. Widget should appear in bottom-right corner
```

**Testing Scenarios Included:**
1. ✅ Allowed origin (should work)
2. ❌ Disallowed origin (should fail)
3. ✅ Wildcard origin (should work)
4. ✅ No restrictions (should work)

---

### 11. ✅ Documentation

Documentation already includes comprehensive security section with:
- Origin restriction explanation
- Format examples (exact, wildcard, multiple)
- Best practices (DO/DON'T lists)
- Testing instructions
- Security recommendations

**Location:** `WIDGET_INTEGRATION.md` (lines 173-240)

---

## 🧪 Testing Guide

### Local Development Testing

**Step 1: Start Services**
```bash
# Terminal 1: Backend
cd apps/api
npm run start:dev

# Terminal 2: Frontend
cd apps/web
npm run dev
```

**Step 2: Create Page Token**
```bash
# Log in to http://localhost:5173
# Navigate to Organization Settings → Widgets
# Create token with origins: http://localhost:5500
# Copy the token
```

**Step 3: Test Widget**
```bash
# Update test-widget.html with your token
# Serve the test page
npx http-server -p 5500

# Open http://localhost:5500/test-widget.html
# Widget should load successfully ✅
```

**Step 4: Test Origin Restriction**
```bash
# Serve from different port
npx http-server -p 8080

# Open http://localhost:8080/test-widget.html
# Should get 403 Forbidden error ❌
```

---

### Manual API Testing

**Test 1: Valid Origin**
```bash
curl -X POST "http://localhost:3001/widget/session" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5500" \
  -d '{"pageToken":"YOUR_TOKEN_HERE"}'

# Expected: {"jwt":"...", "orgId":"...", "expiresIn":300}
```

**Test 2: Invalid Origin**
```bash
curl -X POST "http://localhost:3001/widget/session" \
  -H "Content-Type: application/json" \
  -H "Origin: http://evil-site.com" \
  -d '{"pageToken":"YOUR_TOKEN_HERE"}'

# Expected: 403 Forbidden
```

**Test 3: No Origin (No Restrictions)**
```bash
# Create token with allowedOrigins: []
curl -X POST "http://localhost:3001/widget/session" \
  -H "Content-Type: application/json" \
  -d '{"pageToken":"YOUR_TOKEN_HERE"}'

# Expected: {"jwt":"...", "orgId":"...", "expiresIn":300}
```

---

## 🚀 Deployment Checklist

### Backend Deployment
- [ ] Run Prisma migration: `npx prisma migrate deploy`
- [ ] Verify `allowedOrigins` field exists in database
- [ ] Test widget service endpoints
- [ ] Check activity logs for widget sessions

### Frontend Deployment
- [ ] Build widget bundle: `npm run build:widget`
- [ ] Upload to CDN/S3:
  ```bash
  aws s3 cp dist/widget/workflo-widget-app.iife.js \
    s3://YOUR_BUCKET/workflo-widget-app.iife.js \
    --acl public-read \
    --cache-control max-age=31536000
  ```
- [ ] Update widget URLs in embed code
- [ ] Test widget on production domain

### GitHub Actions Setup
- [ ] Add AWS secrets to GitHub repo
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `WIDGET_S3_BUCKET`
  - `CLOUDFRONT_DISTRIBUTION_ID` (optional)
- [ ] Test workflow with manual trigger
- [ ] Verify S3 upload
- [ ] Check CDN invalidation

### Customer Setup
- [ ] Create page tokens for each customer
- [ ] Set appropriate `allowedOrigins`
- [ ] Provide embed code
- [ ] Test widget on customer sites
- [ ] Monitor activity logs

---

## 🔒 Security Recommendations

### Production Settings

**Required:**
- ✅ Always set `allowedOrigins` for production tokens
- ✅ Use HTTPS origins only
- ✅ Be specific with origins (avoid wildcards)
- ✅ Enable rate limiting on `/widget/session` endpoint
- ✅ Monitor widget session creation logs
- ✅ Set up alerts for suspicious activity

**Optional but Recommended:**
- Set token expiration dates
- Implement token usage analytics
- Add CSP headers to widget
- Enable CORS properly
- Use signed URLs for widget bundle

### Origin Format Guidelines

```javascript
// ✅ GOOD - Specific origins
allowedOrigins: [
  "https://example.com",
  "https://www.example.com",
  "https://app.example.com"
]

// ⚠️ USE WITH CAUTION - Wildcards
allowedOrigins: [
  "*.example.com"  // Matches all subdomains
]

// ❌ BAD - Too permissive
allowedOrigins: []  // Allows any origin (development only!)
```

---

## 📊 Monitoring & Analytics

### Track Widget Usage

**Activity Log Query:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as sessions,
  payload->>'origin' as origin
FROM activity
WHERE type = 'widget.session.created'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), payload->>'origin'
ORDER BY date DESC, sessions DESC;
```

**Token Usage:**
```sql
SELECT 
  pt.id,
  pt.description,
  pt.allowed_origins,
  COUNT(a.id) as sessions,
  MAX(a.created_at) as last_used
FROM page_token pt
LEFT JOIN activity a ON a.payload->>'tokenId' = pt.id
WHERE pt.revoked = false
  AND a.type = 'widget.session.created'
GROUP BY pt.id
ORDER BY sessions DESC;
```

---

## 🎉 Summary

All 8 implementation steps are complete:

1. ✅ Prisma schema updated with `String[]` for `allowedOrigins`
2. ✅ Widget service enforces origin restrictions with wildcard support
3. ✅ Controller passes origin headers correctly
4. ✅ Service methods work with native arrays (no JSON parsing)
5. ✅ DTO created with proper validation
6. ✅ Admin controller uses DTO and normalizes origins
7. ✅ Admin UI displays and manages origins as arrays
8. ✅ Vite build config for IIFE bundle
9. ✅ GitHub Actions workflow for S3 deployment
10. ✅ Test HTML page with comprehensive instructions
11. ✅ Documentation includes security best practices

**Ready to use!** 🚀

Next steps:
- Test locally with `test-widget.html`
- Deploy to production
- Create tokens for customers
- Monitor usage and activity logs
