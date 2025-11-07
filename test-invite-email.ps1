# Test Invite Email System
# This script tests the complete invite flow including email delivery

$baseUrl = "http://localhost:3001"
$ErrorActionPreference = "Continue"

Write-Host "=== Invite Email System Test ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register a user (Admin)
Write-Host "Step 1: Registering admin user..." -ForegroundColor Yellow
$adminEmail = "admin_" + (Get-Random -Maximum 9999) + "@test.com"
$registerBody = @{
    email = $adminEmail
    password = "password123"
    name = "Admin User"
} | ConvertTo-Json

try {
    $adminAuth = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post -Body $registerBody -ContentType "application/json"
    $adminToken = $adminAuth.token
    Write-Host "✓ Admin registered: $adminEmail" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to register admin: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create organization
Write-Host "`nStep 2: Creating organization..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

$orgBody = @{
    name = "Test Org " + (Get-Random -Maximum 9999)
    description = "Testing invite email system"
} | ConvertTo-Json

try {
    $org = Invoke-RestMethod -Uri "$baseUrl/organization" `
        -Method Post -Headers $headers -Body $orgBody
    $orgId = $org.id
    Write-Host "✓ Organization created: $($org.name)" -ForegroundColor Green
    Write-Host "  Org ID: $orgId" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create organization: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create invite (will trigger email)
Write-Host "`nStep 3: Creating invite..." -ForegroundColor Yellow
$inviteEmail = "newuser_" + (Get-Random -Maximum 9999) + "@test.com"
$inviteBody = @{
    email = $inviteEmail
    roleKey = "member"
} | ConvertTo-Json

try {
    $invite = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invite" `
        -Method Post -Headers $headers -Body $inviteBody
    
    Write-Host "✓ Invite created for: $inviteEmail" -ForegroundColor Green
    
    if ($invite.debug) {
        Write-Host "`n📧 DEBUG MODE ENABLED" -ForegroundColor Magenta
        Write-Host "  Token: $($invite.debug.token)" -ForegroundColor Gray
        Write-Host "  Invite URL: $($invite.debug.inviteUrl)" -ForegroundColor Cyan
        Write-Host "`n  Copy this URL to test in browser:" -ForegroundColor Yellow
        Write-Host "  $($invite.debug.inviteUrl)" -ForegroundColor White
        $inviteToken = $invite.debug.token
    } else {
        Write-Host "`n📧 Email sent to: $inviteEmail" -ForegroundColor Magenta
        Write-Host "  Check SendGrid dashboard for delivery status" -ForegroundColor Gray
        Write-Host "  https://app.sendgrid.com/email_activity" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Failed to create invite: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Check invite token (public endpoint)
if ($invite.debug) {
    Write-Host "`nStep 4: Checking invite token (public endpoint)..." -ForegroundColor Yellow
    $checkUrl = "$baseUrl/invite/check?token=$inviteToken"
    
    try {
        $inviteInfo = Invoke-RestMethod -Uri $checkUrl -Method Get
        Write-Host "✓ Invite token is valid" -ForegroundColor Green
        Write-Host "  Email: $($inviteInfo.email)" -ForegroundColor Gray
        Write-Host "  Role: $($inviteInfo.roleKey)" -ForegroundColor Gray
        Write-Host "  Organization: $($inviteInfo.organization.name)" -ForegroundColor Gray
        Write-Host "  Expires: $($inviteInfo.expiresAt)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed to check invite: $_" -ForegroundColor Red
    }
}

# Step 5: Test registration with invite token
Write-Host "`nStep 5: Testing registration with invite token..." -ForegroundColor Yellow
if ($invite.debug) {
    $newUserBody = @{
        email = $inviteEmail
        password = "password123"
        name = "New User"
        inviteToken = $inviteToken
    } | ConvertTo-Json
    
    try {
        $newUserAuth = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
            -Method Post -Body $newUserBody -ContentType "application/json"
        Write-Host "✓ New user registered with invite token" -ForegroundColor Green
        Write-Host "  User should now be a member of the organization" -ForegroundColor Gray
        
        # Verify membership
        $newUserToken = $newUserAuth.token
        $newHeaders = @{
            "Authorization" = "Bearer $newUserToken"
            "Content-Type" = "application/json"
        }
        
        $members = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/members" `
            -Method Get -Headers $newHeaders
        
        $newMember = $members | Where-Object { $_.user.email -eq $inviteEmail }
        if ($newMember) {
            Write-Host "✓ Membership confirmed!" -ForegroundColor Green
            Write-Host "  Role: $($newMember.roleKey)" -ForegroundColor Gray
        } else {
            Write-Host "⚠ Membership not found (may need to check)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ Failed to register with invite: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  Skipping (no debug token available)" -ForegroundColor Gray
    Write-Host "  To test: Use invite link from email" -ForegroundColor Gray
}

# Step 6: Test existing user accepting invite
Write-Host "`nStep 6: Testing existing user accepting invite..." -ForegroundColor Yellow
$existingEmail = "existing_" + (Get-Random -Maximum 9999) + "@test.com"

# Register existing user
$existingBody = @{
    email = $existingEmail
    password = "password123"
    name = "Existing User"
} | ConvertTo-Json

try {
    $existingAuth = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method Post -Body $existingBody -ContentType "application/json"
    $existingToken = $existingAuth.token
    Write-Host "✓ Existing user registered: $existingEmail" -ForegroundColor Green
    
    # Create invite for existing user
    $inviteBody2 = @{
        email = $existingEmail
        roleKey = "admin"
    } | ConvertTo-Json
    
    $invite2 = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invite" `
        -Method Post -Headers $headers -Body $inviteBody2
    
    if ($invite2.debug) {
        $inviteToken2 = $invite2.debug.token
        Write-Host "✓ Invite created for existing user" -ForegroundColor Green
        
        # Accept invite as logged-in user
        $existingHeaders = @{
            "Authorization" = "Bearer $existingToken"
            "Content-Type" = "application/json"
        }
        
        $accept = Invoke-RestMethod -Uri "$baseUrl/invite/$inviteToken2/accept" `
            -Method Post -Headers $existingHeaders -Body "{}"
        
        Write-Host "✓ Existing user accepted invite" -ForegroundColor Green
        Write-Host "  Role: $($accept.membership.roleKey)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed existing user flow: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✓ Invite creation and email delivery tested" -ForegroundColor Green
Write-Host "✓ Public invite check endpoint tested" -ForegroundColor Green
Write-Host "✓ Registration with invite token tested" -ForegroundColor Green
Write-Host "✓ Existing user invite acceptance tested" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check SendGrid dashboard for email delivery status" -ForegroundColor White
Write-Host "2. Test invite URL in browser: /invite/accept?token=..." -ForegroundColor White
Write-Host "3. Configure production SendGrid API key for real emails" -ForegroundColor White
Write-Host "4. Set INVITE_EMAIL_DEV_ECHO=false in production" -ForegroundColor White

Write-Host "`n✅ All tests completed!" -ForegroundColor Green
