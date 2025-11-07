# Test script for Step 8 Admin & Billing APIs
# Requires: Backend running on http://localhost:3001

$baseUrl = "http://localhost:3001"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "=== Step 8: Admin & Billing API Tests ===" -ForegroundColor Cyan
Write-Host ""

# Function to display response
function Show-Response {
    param($response, $title)
    Write-Host "--- $title ---" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
}

try {
    # 1. Register a new user (owner)
    Write-Host "1. Registering owner user..." -ForegroundColor Yellow
    $registerOwnerBody = @{
        email = "owner@test.com"
        password = "password123"
        name = "Organization Owner"
    } | ConvertTo-Json

    $ownerReg = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerOwnerBody -Headers $headers
    Show-Response $ownerReg "Owner Registration"
    $ownerToken = $ownerReg.access_token
    $ownerId = $ownerReg.user.id

    # 2. Create organization
    Write-Host "2. Creating organization..." -ForegroundColor Yellow
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $ownerToken"
    }

    $orgBody = @{
        name = "Test Organization"
        description = "Testing Step 8 features"
    } | ConvertTo-Json

    $org = Invoke-RestMethod -Uri "$baseUrl/organization" -Method Post -Body $orgBody -Headers $authHeaders
    Show-Response $org "Organization Created"
    $orgId = $org.id

    # 3. List members (should show owner)
    Write-Host "3. Listing organization members..." -ForegroundColor Yellow
    $members = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/members" -Method Get -Headers $authHeaders
    Show-Response $members "Current Members"

    # 4. Create invite for new member
    Write-Host "4. Creating member invite..." -ForegroundColor Yellow
    $inviteBody = @{
        email = "member@test.com"
        roleKey = "member"
    } | ConvertTo-Json

    $invite = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invite" -Method Post -Body $inviteBody -Headers $authHeaders
    Show-Response $invite "Invite Created"
    $inviteToken = $invite.token

    # 5. List pending invites
    Write-Host "5. Listing pending invites..." -ForegroundColor Yellow
    $invites = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invites" -Method Get -Headers $authHeaders
    Show-Response $invites "Pending Invites"

    # 6. Register the invited user
    Write-Host "6. Registering invited member..." -ForegroundColor Yellow
    $registerMemberBody = @{
        email = "member@test.com"
        password = "password123"
        name = "Team Member"
    } | ConvertTo-Json

    $memberReg = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerMemberBody -Headers $headers
    Show-Response $memberReg "Member Registration"
    $memberToken = $memberReg.access_token
    $memberId = $memberReg.user.id

    # 7. Accept invite
    Write-Host "7. Accepting invite..." -ForegroundColor Yellow
    $memberAuthHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $memberToken"
    }

    $acceptResult = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invite/$inviteToken/accept" -Method Post -Headers $memberAuthHeaders
    Show-Response $acceptResult "Invite Accepted"

    # 8. List members again (should show 2 members)
    Write-Host "8. Listing members after invite acceptance..." -ForegroundColor Yellow
    $members2 = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/members" -Method Get -Headers $authHeaders
    Show-Response $members2 "Updated Members List"

    # 9. Change member role to admin
    Write-Host "9. Promoting member to admin..." -ForegroundColor Yellow
    $changeRoleBody = @{
        roleKey = "admin"
    } | ConvertTo-Json

    $roleChange = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/members/$memberId/role" -Method Post -Body $changeRoleBody -Headers $authHeaders
    Show-Response $roleChange "Role Changed"

    # 10. Get organization details
    Write-Host "10. Getting organization details..." -ForegroundColor Yellow
    $orgDetails = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/organization" -Method Get -Headers $authHeaders
    Show-Response $orgDetails "Organization Details"

    # 11. Test billing - get subscription
    Write-Host "11. Getting subscription details..." -ForegroundColor Yellow
    $subscription = Invoke-RestMethod -Uri "$baseUrl/billing/organization/$orgId" -Method Get -Headers $authHeaders
    Show-Response $subscription "Subscription Details"

    # 12. Create another invite and revoke it
    Write-Host "12. Creating and revoking invite..." -ForegroundColor Yellow
    $inviteBody2 = @{
        email = "guest@test.com"
        roleKey = "guest"
    } | ConvertTo-Json

    $invite2 = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invite" -Method Post -Body $inviteBody2 -Headers $authHeaders
    Show-Response $invite2 "Second Invite Created"
    
    $revokeResult = Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/invites/$($invite2.inviteId)" -Method Delete -Headers $authHeaders
    Show-Response $revokeResult "Invite Revoked"

    # 13. Test insufficient permissions (member trying to remove)
    Write-Host "13. Testing RBAC - member trying to remove (should fail)..." -ForegroundColor Yellow
    try {
        $removeBody = @{ userId = $ownerId } | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/organization/$orgId/admin/remove-member" -Method Post -Body $removeBody -Headers $memberAuthHeaders
        Write-Host "ERROR: Member was able to remove owner (should have failed!)" -ForegroundColor Red
    } catch {
        Write-Host "✓ Correctly blocked: $($_.Exception.Message)" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "=== All Tests Completed Successfully ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "  Owner ID: $ownerId"
    Write-Host "  Member ID: $memberId"
    Write-Host "  Organization ID: $orgId"
    Write-Host "  Owner Token: $ownerToken"
    Write-Host "  Member Token: $memberToken"

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}
