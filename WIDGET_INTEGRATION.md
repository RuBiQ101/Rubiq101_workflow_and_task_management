# Workflo Widget Integration Guide

Complete guide for embedding the Workflo workflow management widget on your website.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Setup Guide](#setup-guide)
4. [Configuration Options](#configuration-options)
5. [Security](#security)
6. [Advanced Features](#advanced-features)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

The Workflo widget allows you to embed workflow and task management functionality directly on your website. It provides:

- ✅ Real-time task management
- ✅ Secure token-based authentication
- ✅ Customizable appearance and position
- ✅ WebSocket support for live updates
- ✅ Responsive design
- ✅ Simple copy-paste integration

---

## Quick Start

### Step 1: Generate a Page Token

1. Log in to your Workflo admin dashboard
2. Navigate to **Organization → Widgets → Page Tokens**
3. Click **"Create Token"**
4. Copy the generated token (it will only be shown once!)

### Step 2: Add the Embed Code

Paste this code into your website's HTML (preferably before the closing `</body>` tag):

```html
<!-- Workflo Widget -->
<script>
  window.WorkfloWidgetConfig = {
    pageToken: "YOUR_PAGE_TOKEN_HERE",
    apiBase: "https://api.yourapp.com",
    widgetUrl: "https://cdn.yourapp.com/workflo-widget-app.js"
  };
</script>
<script src="https://cdn.yourapp.com/workflo-widget-v1.js" async></script>
```

### Step 3: Test

Reload your page and you should see the Workflo widget appear in the bottom-right corner!

---

## Setup Guide

### For Website Owners

#### Prerequisites
- Active Workflo account
- Admin or Owner role in your organization
- Website where you want to embed the widget

#### Detailed Setup

1. **Create a Page Token**
   ```
   Admin Dashboard → Organization Settings → Widgets → Page Tokens → Create Token
   ```

2. **Configure Token (Optional but Recommended)**
   - Add a description (e.g., "Marketing website")
   - Set allowed origins for security (e.g., `https://example.com`)
   - Multiple origins: `https://example.com, https://www.example.com`
   - Wildcards supported: `https://*.example.com`

3. **Copy the Embed Code**
   - Click **"Copy Embed Code"** button
   - The code includes your token and API endpoints

4. **Add to Your Website**
   
   **For HTML websites:**
   ```html
   <!-- Add before </body> -->
   <script>
     window.WorkfloWidgetConfig = {
       pageToken: "abc123...",
       apiBase: "https://api.yourapp.com"
     };
   </script>
   <script src="https://cdn.yourapp.com/workflo-widget-v1.js" async></script>
   ```

   **For React/Next.js:**
   ```jsx
   // Add to _app.js or layout component
   useEffect(() => {
     window.WorkfloWidgetConfig = {
       pageToken: process.env.NEXT_PUBLIC_WORKFLO_TOKEN,
       apiBase: process.env.NEXT_PUBLIC_WORKFLO_API
     };
     
     const script = document.createElement('script');
     script.src = 'https://cdn.yourapp.com/workflo-widget-v1.js';
     script.async = true;
     document.body.appendChild(script);
     
     return () => document.body.removeChild(script);
   }, []);
   ```

   **For WordPress:**
   ```php
   // Add to theme's functions.php or use a custom HTML plugin
   add_action('wp_footer', function() {
     ?>
     <script>
       window.WorkfloWidgetConfig = {
         pageToken: "<?php echo get_option('workflo_token'); ?>",
         apiBase: "https://api.yourapp.com"
       };
     </script>
     <script src="https://cdn.yourapp.com/workflo-widget-v1.js" async></script>
     <?php
   });
   ```

---

## Configuration Options

### Basic Configuration

```javascript
window.WorkfloWidgetConfig = {
  // Required
  pageToken: "your_page_token_here",
  
  // Optional
  apiBase: "https://api.yourapp.com",        // API endpoint
  wsBase: "https://api.yourapp.com",          // WebSocket endpoint (defaults to apiBase)
  widgetUrl: "https://cdn.yourapp.com/workflo-widget-app.js",
  
  // Appearance
  position: "bottom-right",                    // bottom-right, bottom-left, top-right, top-left
  theme: "light",                              // light, dark
  primaryColor: "#4F46E5",                     // Brand color (hex)
};
```

### Position Options

- `bottom-right` (default) - Lower right corner
- `bottom-left` - Lower left corner
- `top-right` - Upper right corner
- `top-left` - Upper left corner

### Theme Options

- `light` (default) - Light theme
- `dark` - Dark theme

---

## Security

### How Authentication Works

1. **Page Token Exchange**
   - Your website sends the `pageToken` to `/widget/session`
   - Server validates the token and checks origin (if configured)
   - Returns an ephemeral JWT (valid for 5 minutes)

2. **JWT Usage**
   - Widget uses JWT for all API calls
   - JWT automatically refreshes before expiration
   - JWT contains only organization ID and widget scope

3. **Origin Validation**
   - Optional but strongly recommended
   - Configure allowed origins in token settings
   - Prevents unauthorized use of your token

### Security Best Practices

#### ✅ DO:
- **Restrict Origins**: Always set `allowedOrigins` for production tokens
- **Use HTTPS**: Only embed on HTTPS sites
- **Rotate Tokens**: Periodically revoke and recreate tokens
- **Monitor Usage**: Check activity logs for suspicious behavior
- **Environment Variables**: Store tokens in environment variables, not in code

#### ❌ DON'T:
- **Never** commit tokens to version control
- **Never** share tokens publicly
- **Never** use the same token across multiple unrelated sites
- **Never** store tokens in client-side JavaScript (except via config)

### Origin Restriction Examples

**Single domain:**
```javascript
allowedOrigins: ["https://example.com"]
```

**Multiple domains:**
```javascript
allowedOrigins: [
  "https://example.com",
  "https://www.example.com",
  "https://blog.example.com"
]
```

**Wildcard subdomains:**
```javascript
allowedOrigins: ["https://*.example.com"]
```

**Development and production:**
```javascript
allowedOrigins: [
  "http://localhost:3000",
  "https://example.com"
]
```

---

## Advanced Features

### Customization

#### Custom Colors
```javascript
window.WorkfloWidgetConfig = {
  pageToken: "...",
  primaryColor: "#FF6B6B",  // Custom brand color
  theme: "dark"              // Dark theme
};
```

#### Custom Position
```javascript
window.WorkfloWidgetConfig = {
  pageToken: "...",
  position: "top-left"  // Move to top-left corner
};
```

### Programmatic Control

The widget exposes a global API for programmatic control:

```javascript
// Destroy the widget
window.WorkfloWidget.destroy();

// Reload the widget
window.WorkfloWidget.reload();

// Check if widget is loaded
if (window.__workfloWidgetLoaded) {
  console.log('Widget is active');
}
```

### Event Handling

Listen to widget events:

```javascript
// Widget loaded
document.addEventListener('workflo:loaded', () => {
  console.log('Widget loaded successfully');
});

// Task created
document.addEventListener('workflo:task-created', (e) => {
  console.log('Task created:', e.detail);
});
```

### Iframe Alternative

For more control, use an iframe:

```html
<iframe 
  src="https://app.yourapp.com/embed?orgId=your_org_id"
  width="100%" 
  height="600"
  frameborder="0"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

**PostMessage Communication:**
```javascript
// Parent page
const iframe = document.querySelector('iframe');

// Listen to messages from widget
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://app.yourapp.com') return;
  
  console.log('Message from widget:', event.data);
});

// Send messages to widget
iframe.contentWindow.postMessage({
  type: 'custom-event',
  data: { /* your data */ }
}, 'https://app.yourapp.com');
```

---

## Troubleshooting

### Widget Not Appearing

**Problem:** Widget doesn't show on the page

**Solutions:**
1. Check browser console for errors (F12)
2. Verify `pageToken` is correct
3. Check if widget scripts loaded (Network tab)
4. Ensure `apiBase` URL is correct
5. Check for JavaScript conflicts with other scripts

### Authentication Errors

**Problem:** "Invalid or revoked page token"

**Solutions:**
1. Verify token hasn't been revoked
2. Check if token was copied correctly
3. Ensure no extra spaces in token
4. Create a new token and try again

### Origin Not Allowed

**Problem:** "Origin not allowed for this token"

**Solutions:**
1. Check `allowedOrigins` configuration
2. Verify your website URL matches exactly
3. Include protocol (https://)
4. For development, add `http://localhost:3000`
5. Use wildcards for subdomains: `https://*.example.com`

### Widget Not Loading on Mobile

**Problem:** Widget doesn't work on mobile devices

**Solutions:**
1. Check responsive CSS
2. Verify touch events are enabled
3. Test on multiple devices/browsers
4. Check console for mobile-specific errors

### CORS Errors

**Problem:** CORS policy blocking requests

**Solutions:**
1. Ensure `apiBase` is correct
2. Check server CORS configuration
3. Verify origin is in `allowedOrigins`
4. Contact support if issue persists

### Performance Issues

**Problem:** Widget slows down the page

**Solutions:**
1. Load widget script with `async` attribute
2. Place script at end of `<body>`
3. Use CDN for widget scripts
4. Check network tab for slow requests
5. Consider lazy-loading the widget

---

## API Reference

### Widget Configuration Object

```typescript
interface WorkfloWidgetConfig {
  pageToken: string;              // Required: Your page token
  apiBase?: string;                // API endpoint URL
  wsBase?: string;                 // WebSocket endpoint URL
  widgetUrl?: string;              // Widget bundle URL
  position?: WidgetPosition;       // Widget position
  theme?: 'light' | 'dark';        // Color theme
  primaryColor?: string;           // Brand color (hex)
}

type WidgetPosition = 
  | 'bottom-right' 
  | 'bottom-left' 
  | 'top-right' 
  | 'top-left';
```

### Widget API Methods

```typescript
interface WorkfloWidget {
  destroy(): void;    // Remove widget from page
  reload(): void;     // Reload widget
}

// Usage
window.WorkfloWidget.destroy();
window.WorkfloWidget.reload();
```

### Backend Endpoints

#### Public Endpoints

**Create Widget Session**
```
POST /widget/session
Body: { pageToken: string }
Response: { jwt: string, orgId: string, expiresIn: number }
```

**Get Widget Configuration**
```
GET /widget/config/:orgId
Response: { orgId, name, features, plan }
```

#### Admin Endpoints (Authenticated)

**Create Page Token**
```
POST /organization/:orgId/widget-admin/page-tokens
Headers: Authorization: Bearer <jwt>
Body: { description?: string, allowedOrigins?: string[] }
Response: PageToken
```

**List Page Tokens**
```
GET /organization/:orgId/widget-admin/page-tokens
Headers: Authorization: Bearer <jwt>
Response: PageToken[]
```

**Revoke Page Token**
```
DELETE /organization/:orgId/widget-admin/page-tokens/:tokenId
Headers: Authorization: Bearer <jwt>
Response: PageToken
```

**Update Allowed Origins**
```
PATCH /organization/:orgId/widget-admin/page-tokens/:tokenId/origins
Headers: Authorization: Bearer <jwt>
Body: { allowedOrigins: string[] }
Response: PageToken
```

---

## Support & Resources

### Documentation
- **Full API Docs**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Backend Setup**: [apps/api/README.md](./apps/api/README.md)
- **Frontend Guide**: [apps/web/WEB_INTERFACE_GUIDE.md](./apps/web/WEB_INTERFACE_GUIDE.md)

### Getting Help
- Check [Troubleshooting](#troubleshooting) section
- Review browser console errors
- Check network tab for failed requests
- Contact support with error details

### Examples
- [Basic HTML Example](./examples/basic-html.html)
- [React Example](./examples/react-integration.jsx)
- [WordPress Example](./examples/wordpress-integration.php)
- [Iframe Example](./examples/iframe-embed.html)

---

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Page token authentication
- Real-time WebSocket support
- Customizable appearance
- Origin restriction
- Admin management UI

---

**Built with ❤️ by the Workflo Team**

Questions? Contact support@workflo.app
