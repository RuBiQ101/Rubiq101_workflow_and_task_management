# Test login endpoint
Write-Host "Testing /auth/login..." -ForegroundColor Cyan
$loginBody = @{
    email = "demo@local.test"
    password = "demo1234"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "Access Token: $($loginResponse.accessToken.Substring(0, 50))..." -ForegroundColor Yellow
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test register endpoint with new user
Write-Host "Testing /auth/register..." -ForegroundColor Cyan
$registerBody = @{
    email = "newuser@test.com"
    password = "test1234"
    name = "New User"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
    Write-Host "✓ Registration successful!" -ForegroundColor Green
    Write-Host "Access Token: $($registerResponse.accessToken.Substring(0, 50))..." -ForegroundColor Yellow
} catch {
    Write-Host "✗ Registration failed (user may already exist): $_" -ForegroundColor Yellow
}

Write-Host ""

# Test with wrong password
Write-Host "Testing /auth/login with wrong password..." -ForegroundColor Cyan
$wrongBody = @{
    email = "demo@local.test"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $wrongResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $wrongBody
    Write-Host "✗ Should have failed but didn't!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Correctly returned 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected error: $_" -ForegroundColor Red
    }
}
