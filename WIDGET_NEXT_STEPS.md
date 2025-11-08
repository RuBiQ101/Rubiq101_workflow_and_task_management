# Widget Implementation - Next Steps

## ✅ What's Been Created

I've successfully implemented the complete widget embedding system for your Workflow Management Platform:

### Backend (NestJS)
1. **Database Model** - `PageToken` model in `schema.prisma`
2. **WidgetService** - Core business logic for token management and JWT exchange
3. **WidgetController** - Public endpoints for widget authentication
4. **WidgetAdminController** - Protected admin endpoints for token management
5. **WidgetModule** - Module configuration with JWT support

### Frontend (React)
1. **Embed Loader** - `workflo-widget-v1.js` - Lightweight loader script
2. **Widget App** - `WidgetApp.jsx` - Full React widget application
3. **Admin UI** - `PageTokensAdmin.jsx` - Token management interface
4. **Documentation** - `WIDGET_INTEGRATION.md` - Complete integration guide

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```powershell
cd "c:\My Projects\Workflow management\workflow-platform\apps\api"
npx prisma migrate dev --name add_page_token
```

This will create the `PageToken` table in your database.

### Step 2: Add Widget Module to App Module

Update `apps/api/src/app.module.ts` to include the WidgetModule:

```typescript
import { WidgetModule } from './widget/widget.module';

@Module({
  imports: [
    // ... existing imports
    WidgetModule,
  ],
  // ... rest of module config
})
export class AppModule {}
```

### Step 3: Update RealtimeGateway for Widget Auth

Update `apps/api/src/realtime/realtime.gateway.ts` to support widget JWT:

```typescript
import { JwtService } from '@nestjs/jwt';

export class RealtimeGateway {
  constructor(
    private jwtService: JwtService,
    // ... other services
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token
      const token = 
        client.handshake.auth?.token || 
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect(true);
        return;
      }

      // Verify JWT
      const payload: any = this.jwtService.verify(token);

      // Attach user data to socket
      (client as any).user = {
        id: payload.sub,
        orgId: payload.orgId,
        isWidget: payload.src === 'widget',
      };

      // Join organization room
      client.join(`org:${payload.orgId}`);

      console.log(`Socket connected: ${payload.sub} (widget: ${payload.src === 'widget'})`);
    } catch (err) {
      console.error('Socket auth failed:', err);
      client.disconnect(true);
    }
  }
}
```

### Step 4: Build Widget Bundle

Create a separate build config for the widget:

**Create `apps/web/vite.widget.config.js`:**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/widget/WidgetApp.jsx',
      name: 'WorkfloWidgetApp',
      fileName: 'workflo-widget-app',
      formats: ['iife'],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    outDir: 'dist/widget',
  },
});
```

**Add build script to `apps/web/package.json`:**

```json
{
  "scripts": {
    "build:widget": "vite build --config vite.widget.config.js"
  }
}
```

**Build the widget:**

```powershell
cd "c:\My Projects\Workflow management\workflow-platform\apps\web"
npm run build:widget
```

### Step 5: Copy Widget Files to Public

```powershell
# Copy built widget to public directory
Copy-Item "dist/widget/workflo-widget-app.iife.js" "public/workflo-widget-app.js"

# The loader script is already in public/workflo-widget-v1.js
```

### Step 6: Add Admin UI to Dashboard

Update your admin dashboard to include the PageTokensAdmin component:

```jsx
// In your admin/settings page
import PageTokensAdmin from '../components/PageTokensAdmin';

function OrganizationSettingsPage() {
  const { orgId } = useParams();
  
  return (
    <div>
      <h1>Organization Settings</h1>
      
      {/* Other settings sections */}
      
      <section className="mt-8">
        <PageTokensAdmin orgId={orgId} />
      </section>
    </div>
  );
}
```

---

## 🧪 Testing the Widget

### Local Testing

1. **Start Backend:**
   ```powershell
   cd apps/api
   npm run start:dev
   ```

2. **Start Frontend:**
   ```powershell
   cd apps/web
   npm run dev
   ```

3. **Create a Test Page:**
   
   Create `test-widget.html`:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="UTF-8">
     <title>Widget Test</title>
   </head>
   <body>
     <h1>Test Page</h1>
     <p>The widget should appear in the bottom-right corner.</p>

     <script>
       window.WorkfloWidgetConfig = {
         pageToken: "YOUR_TOKEN_HERE",
         apiBase: "http://localhost:3001",
         widgetUrl: "http://localhost:5173/workflo-widget-app.js"
       };
     </script>
     <script src="http://localhost:5173/workflo-widget-v1.js"></script>
   </body>
   </html>
   ```

4. **Create a Page Token:**
   - Log in to your app
   - Go to Organization Settings → Widgets
   - Create a new token
   - Copy the token

5. **Update test-widget.html:**
   - Replace `YOUR_TOKEN_HERE` with your actual token

6. **Open test-widget.html:**
   - Open the file in a browser
   - Widget should appear in bottom-right corner

---

## 📦 Production Deployment

### Option A: CDN Deployment

**Using AWS S3 + CloudFront:**

```powershell
# Build widget
npm run build:widget

# Upload to S3
aws s3 cp dist/widget/workflo-widget-app.iife.js s3://your-bucket/widget/v1/workflo-widget-app.js --cache-control "max-age=31536000"
aws s3 cp public/workflo-widget-v1.js s3://your-bucket/widget/v1/workflo-widget-v1.js --cache-control "max-age=31536000"
```

**Update CloudFront:**
```powershell
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/widget/v1/*"
```

### Option B: Self-Hosted

Serve widget files from your main application:

```javascript
// In your express/nestjs server
app.use('/widget', express.static('dist/widget', {
  maxAge: '1y',
  immutable: true
}));
```

---

## 🔧 Optional Enhancements

### A) Enhanced Origin Validation

Already implemented in `WidgetService.createWidgetSession()`

### B) Rate Limiting

Add to `widget.controller.ts`:

```typescript
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('widget')
@UseGuards(ThrottlerGuard)
export class WidgetController {
  // Rate limit: 10 requests per minute per IP
}
```

### C) Analytics Tracking

Add analytics to widget initialization:

```typescript
// In WidgetService
await this.prisma.activity.create({
  data: {
    organizationId: rec.orgId,
    type: 'widget.session.created',
    payload: {
      tokenId: rec.id,
      origin: origin || 'unknown',
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    },
  },
});
```

### D) Custom Branding

Add to widget config:

```javascript
window.WorkfloWidgetConfig = {
  pageToken: "...",
  branding: {
    logo: "https://your-site.com/logo.png",
    color: "#FF6B6B",
    title: "My Tasks"
  }
};
```

---

## 📊 Monitoring & Maintenance

### Track Widget Usage

```sql
-- Sessions created per day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as sessions
FROM activity
WHERE type = 'widget.session.created'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Active tokens
SELECT 
  COUNT(*) as active_tokens
FROM page_token
WHERE revoked = false;

-- Sessions by origin
SELECT 
  payload->>'origin' as origin,
  COUNT(*) as count
FROM activity
WHERE type = 'widget.session.created'
GROUP BY payload->>'origin'
ORDER BY count DESC;
```

### Health Check

```typescript
@Get('widget/health')
healthCheck() {
  return {
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };
}
```

---

## ✅ Checklist

- [ ] Run Prisma migration (`npx prisma migrate dev`)
- [ ] Add WidgetModule to AppModule
- [ ] Update RealtimeGateway for widget auth
- [ ] Build widget bundle (`npm run build:widget`)
- [ ] Add PageTokensAdmin to dashboard
- [ ] Test widget locally with test HTML page
- [ ] Create production page token
- [ ] Deploy widget files to CDN/production
- [ ] Update CORS settings if needed
- [ ] Test on production domain
- [ ] Monitor analytics and logs
- [ ] Document for your team

---

## 🎉 You're Done!

The widget system is now complete and ready to use. Customers can:

1. Get a page token from your admin
2. Paste the embed code on their site
3. Start managing tasks through the widget

All with secure, origin-restricted, time-limited authentication!

---

**Need Help?**

- Check `WIDGET_INTEGRATION.md` for user-facing docs
- Review code comments in widget files
- Test with `test-widget.html`
- Check browser console for errors
