# 🚀 Quick Start - Testing Your Authentication

## Immediate Actions to Debug Issues

### Step 1: Open Debug Console
1. Navigate to: **http://localhost:5173/debug**
2. Wait for all tests to complete
3. Look for any ❌ RED tests

### Step 2: Check Browser Console
1. Press **F12** to open Developer Tools
2. Click **Console** tab
3. Look for these logs:
   - `=== APP START DEBUG INFO ===`
   - `API Health Check: ✅ Healthy` or `❌ Unhealthy`
   - Any RED error messages

### Step 3: Check Network Tab
1. In Developer Tools, click **Network** tab
2. Filter by **Fetch/XHR**
3. Try to login
4. Look for failed requests (RED text)
5. Click on failed request and check:
   - **Response** tab - What error message?
   - **Headers** tab - Is `Authorization` header present?

---

## Backend Test Commands

Run these in PowerShell to verify backend is working:

### Test 1: Login
```powershell
$body = '{"email":"demo@example.com","password":"demo123"}'
Invoke-WebRequest -Uri http://localhost:3000/auth/login -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

**Expected:** Should return JSON with `accessToken` field

### Test 2: Verify Token Works
```powershell
# Replace YOUR_TOKEN with the token from Test 1
$token = "YOUR_TOKEN"
Invoke-WebRequest -Uri http://localhost:3000/auth/me -Method GET -Headers @{Authorization = "Bearer $token"} | Select-Object -ExpandProperty Content
```

**Expected:** Should return JSON with user `id`

---

## Common Fixes

### Backend Not Responding?
```powershell
cd "c:\My Projects\Workflow management\workflow-platform\apps\api"
npm run start:dev
```

### Database Not Running?
```powershell
docker start postgres-workflow
```

### Port 3000 Conflict?
```powershell
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## What to Look For

### ✅ Everything Working:
- Debug page shows all GREEN tests
- Console shows: `API Health Check: ✅ Healthy`
- Login redirects to dashboard
- Network tab shows 200/201 status codes

### ❌ Backend Issue:
- Debug page: Health endpoint test FAILED
- Console shows: `API Health Check: ❌ Unhealthy`
- Red banner at top: "Backend server is not responding"
- **Fix:** Start backend server

### ❌ Token Storage Issue:
- Login succeeds but immediately returns to login page
- Console shows: `Token not stored properly`
- **Fix:** Check browser settings, try incognito mode

### ❌ Authentication Issue:
- Login returns 401 or 500 error
- Console shows: `Authentication failed`
- **Fix:** Check backend logs, verify database is seeded

---

## Demo Account
**Email:** demo@example.com  
**Password:** demo123

---

## Getting Help

If still stuck:
1. ✅ Run all tests on Debug page (`/debug`)
2. ✅ Take screenshot of results
3. ✅ Copy browser console logs
4. ✅ Copy backend server console output
5. ✅ Share all three for diagnosis
