# Get Workspace ID for frontend configuration
$baseUrl = "http://localhost:3001"

Write-Host "=== Login to get workspace ID ===" -ForegroundColor Green
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = "demo@local.test"
    password = "demo1234"
} | ConvertTo-Json) -ContentType "application/json"

$token = $loginResponse.access_token
Write-Host "Logged in successfully!" -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Getting Organizations and Workspaces ===" -ForegroundColor Green
$orgs = Invoke-RestMethod -Uri "$baseUrl/organization" -Method Get -Headers $headers

if ($orgs.Count -gt 0) {
    $org = $orgs[0]
    Write-Host "`nOrganization: $($org.name)" -ForegroundColor Cyan
    
    if ($org.workspaces -and $org.workspaces.Count -gt 0) {
        $workspace = $org.workspaces[0]
        $workspaceId = $workspace.id
        Write-Host "Workspace: $($workspace.name)" -ForegroundColor Cyan
        Write-Host "Workspace ID: $workspaceId" -ForegroundColor Green
        
        # Update the .env file
        $envPath = "apps\web\.env"
        $envContent = Get-Content $envPath -Raw
        $envContent = $envContent -replace 'VITE_WORKSPACE_ID=.*', "VITE_WORKSPACE_ID=$workspaceId"
        Set-Content -Path $envPath -Value $envContent
        
        Write-Host "`n✓ Updated apps\web\.env with workspace ID!" -ForegroundColor Green
        Write-Host "`nYou can now run the frontend with:" -ForegroundColor Yellow
        Write-Host "  cd apps\web" -ForegroundColor White
        Write-Host "  pnpm dev" -ForegroundColor White
    } else {
        Write-Host "No workspaces found. Create a workspace first." -ForegroundColor Red
    }
} else {
    Write-Host "No organizations found. Create an organization first." -ForegroundColor Red
}
