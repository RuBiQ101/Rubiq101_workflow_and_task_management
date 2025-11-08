# 🔧 Debugging Guide - Authentication & API Issues

## Quick Start - How to Debug Issues

### 1. Open the Debug Console
Navigate to: **http://localhost:5173/debug**

This page runs 6 comprehensive tests:
- ✅ localStorage token check
- ✅ Environment variables verification
- ✅ Backend health endpoint test
- ✅ Login endpoint test
- ✅ Protected endpoint authorization test
- ✅ CORS configuration test

### 2. Check Browser Console
Open Developer Tools (F12) and look at the Console tab for:
- `=== APP START DEBUG INFO ===` - Shows app initialization details
- `=== AUTHENTICATION ATTEMPT ===` - Shows login flow details
- ✅ Success indicators (green checkmarks)
- ❌ Error indicators (red X marks)
- ⚠️ Warning indicators (yellow warnings)

### 3. Check Browser Network Tab
In Developer Tools, go to Network tab:
1. Filter by "Fetch/XHR"
2. Look for API calls to `localhost:3000`
3. Click on failed requests (red) to see:
   - **Headers** - Is Authorization header present?
   - **Response** - What error is the server returning?
   - **Preview** - Formatted view of response

---

## Backend Verification

### Test if Backend is Running
```powershell
# Test health endpoint
Invoke-WebRequest -Uri http://localhost:3000/health -Method GET
```

### Test Login Endpoint
```powershell
$body = '{"email":"demo@example.com","password":"demo123"}'
$response = Invoke-WebRequest -Uri http://localhost:3000/auth/login -Method POST -Body $body -ContentType "application/json"
$response.Content | ConvertFrom-Json
```

Expected response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test Protected Endpoint
```powershell
$token = "YOUR_TOKEN_HERE"
$response = Invoke-WebRequest -Uri http://localhost:3000/auth/me -Method GET -Headers @{Authorization = "Bearer $token"}
$response.Content | ConvertFrom-Json
```

---

## Common Issues & Solutions

### Issue 1: "Backend server is not responding"
**Symptoms:**
- Red banner at top of app
- Debug page shows health endpoint test failed
- Console shows: `API Health Check: ❌ Unhealthy`

**Solutions:**
1. Check if backend is running:
   ```powershell
   cd "c:\My Projects\Workflow management\workflow-platform\apps\api"
   npm run start:dev
   ```

2. Verify PostgreSQL is running:
   ```powershell
   docker ps
   ```
   Should show `postgres-workflow` container

3. Check if port 3000 is in use:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000
   ```

### Issue 2: "Authentication failed" / "Internal server error"
**Symptoms:**
- Login button returns error
- Console shows 500 or 401 status code
- Network tab shows failed POST to `/auth/login`

**Solutions:**
1. Check backend logs for errors
2. Verify database migrations are applied:
   ```powershell
   cd apps/api
   npx prisma migrate deploy
   ```

3. Ensure demo user exists:
   ```powershell
   npm run prisma:seed
   ```

### Issue 3: "Token not stored properly"
**Symptoms:**
- Login succeeds but immediately redirects back
- Console shows: `❌ Token storage failed`

**Solutions:**
1. Check if localStorage is enabled in browser
2. Try incognito/private mode
3. Clear browser cache and cookies
4. Check for browser extensions blocking storage

### Issue 4: "Token validation failed" (401 on /auth/me)
**Symptoms:**
- Login returns token but `/auth/me` fails
- Console shows: `⚠️ Token validation failed`
- Backend might not be validating JWT correctly

**Solutions:**
1. Check JWT_SECRET in backend `.env` file
2. Verify token format is correct (should start with `eyJ`)
3. Check token expiration (default 7 days)
4. Look at backend console for validation errors

### Issue 5: CORS Errors
**Symptoms:**
- Console shows: "CORS policy: No 'Access-Control-Allow-Origin'"
- Network tab shows CORS error

**Solutions:**
1. Check backend CORS configuration in `main.ts`:
   ```typescript
   app.enableCors({
     origin: 'http://localhost:5173',
     credentials: true
   });
   ```

2. Verify `CORS_ORIGIN` in backend `.env`

---

## Debug Logging Guide

### App Initialization Logs
```javascript
=== APP START DEBUG INFO ===
Token exists: true/false
Token value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Token length: 189
API Base URL: http://localhost:3000
Demo Workspace: workspace-id
Current path: /login
Environment mode: development
All localStorage keys: ["token"]
============================
API Health Check: ✅ Healthy / ❌ Unhealthy
```

### Login Flow Logs
```javascript
=== AUTHENTICATION ATTEMPT ===
Making request to: /auth/login
Email: demo@example.com
Has password: true
Password length: 7
✅ Authentication response received: { accessToken: "..." }
Token received (first 30 chars): eyJhbGciOiJIUzI1NiIsInR5cCI6...
Token length: 189
Token stored in localStorage
✅ Token verified in localStorage
Testing token with /auth/me endpoint...
✅ Token validation successful. User data: { id: "..." }
Redirecting to dashboard...
=== AUTHENTICATION ATTEMPT COMPLETE ===
```

### API Request Logs
```javascript
Request with auth token to: /auth/me
API Response: /auth/me 200
```

### Error Logs
```javascript
=== AUTHENTICATION ERROR ===
Full error object: Error: ...
Error message: ...
Response status: 401
Response data: { message: "Invalid credentials" }
Final error message: Invalid email or password
=== AUTHENTICATION ATTEMPT COMPLETE ===
```

---

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_API_BASE=http://localhost:3000
VITE_WORKSPACE_ID=your-workspace-id
```

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/workflow
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

---

## Testing Checklist

Before debugging, verify:

- [ ] PostgreSQL Docker container is running (`docker ps`)
- [ ] Backend server is running on port 3000
- [ ] Frontend dev server is running on port 5173
- [ ] Database migrations are applied
- [ ] Demo user exists in database
- [ ] Environment variables are set correctly
- [ ] No port conflicts (check with `Get-NetTCPConnection`)
- [ ] Browser console is open for logging
- [ ] Network tab is recording requests

---

## Demo Credentials

**Email:** demo@example.com  
**Password:** demo123

---

## Debug Page Features

The `/debug` route provides real-time testing:

1. **localStorage Test** - Verifies token is stored and accessible
2. **Environment Test** - Shows all VITE_* environment variables
3. **Health Test** - Checks if backend responds to `/health`
4. **Login Test** - Attempts login with demo credentials
5. **Protected Test** - Validates stored token with `/auth/me`
6. **CORS Test** - Checks CORS headers from backend

Each test shows:
- ✅ Green = Success
- ❌ Red = Error (needs fixing)
- ⚠️ Yellow = Skipped (conditional test)

---

## Support

If issues persist after following this guide:

1. Check all console logs (both browser and backend)
2. Review Network tab for failed requests
3. Run the Debug Page and save results
4. Check backend server logs for stack traces
5. Verify all environment variables are correct

For additional help, share:
- Screenshots of Debug Page results
- Browser console logs
- Backend server logs
- Network tab showing failed request details
