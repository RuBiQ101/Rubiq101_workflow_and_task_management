# First, login to get a token
Write-Host "Step 1: Logging in..." -ForegroundColor Cyan
$loginBody = @{
    email = "demo@local.test"
    password = "demo1234"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.accessToken
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 30))..." -ForegroundColor Yellow
    Write-Host ""
    
    # Create an organization
    Write-Host "Step 2: Creating organization..." -ForegroundColor Cyan
    $orgBody = @{
        name = "Test Company"
        description = "A test organization"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $orgResponse = Invoke-RestMethod -Uri "http://localhost:3001/organization" -Method POST -Headers $headers -Body $orgBody
    Write-Host "✓ Organization created!" -ForegroundColor Green
    Write-Host "Organization ID: $($orgResponse.id)" -ForegroundColor Yellow
    Write-Host "Organization Name: $($orgResponse.name)" -ForegroundColor Yellow
    Write-Host ""
    
    # List organizations
    Write-Host "Step 3: Listing user organizations..." -ForegroundColor Cyan
    $listResponse = Invoke-RestMethod -Uri "http://localhost:3001/organization" -Method GET -Headers $headers
    Write-Host "✓ Found $($listResponse.Count) organization(s)" -ForegroundColor Green
    foreach ($org in $listResponse) {
        Write-Host "  - $($org.name) (ID: $($org.id))" -ForegroundColor Yellow
        Write-Host "    Workspaces: $($org.workspaces.Count)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
