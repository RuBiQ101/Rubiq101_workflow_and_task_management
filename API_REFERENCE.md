# 🚀 Step 8 API Quick Reference

## 🔐 Admin Endpoints

### List Members
```http
GET /organization/:organizationId/admin/members
Authorization: Bearer <token>
Roles: owner, admin, member
```

### Invite Member (Sends Email)
```http
POST /organization/:organizationId/admin/invite
Authorization: Bearer <token>
Roles: owner, admin

{
  "email": "user@example.com",
  "roleKey": "member"  // owner | admin | member | guest
}

Response (Dev Mode - INVITE_EMAIL_DEV_ECHO=true):
{
  "invite": {
    "id": "inv_...",
    "email": "user@example.com"
  },
  "debug": {
    "token": "abc123...",
    "inviteUrl": "http://localhost:5173/invite/accept?token=abc123..."
  }
}

Response (Production - INVITE_EMAIL_DEV_ECHO=false):
{
  "ok": true,
  "invite": {
    "id": "inv_...",
    "email": "user@example.com"
  }
}

Note: Email is automatically sent to the invited user with accept link
```

### Check Invite Validity (Public)
```http
GET /invite/check?token=abc123...
No Authorization required

Response:
{
  "email": "user@example.com",
  "roleKey": "member",
  "expiresAt": "2025-11-14T...",
  "organization": {
    "id": "org_...",
    "name": "My Organization",
    "description": "..."
  }
}
```

### Accept Invite (Logged-in User)
```http
POST /invite/:token/accept
Authorization: Bearer <token>

Response:
{
  "member": { ... },
  "organization": { ... }
}
```

### Register with Invite Token
```http
POST /auth/register

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "inviteToken": "abc123..."  // Auto-joins organization
}
```

### Accept Invite
```http
POST /organization/:organizationId/admin/invite/:token/accept
Authorization: Bearer <token>
```

### List Pending Invites
```http
GET /organization/:organizationId/admin/invites
Authorization: Bearer <token>
Roles: owner, admin
```

### Revoke Invite
```http
DELETE /organization/:organizationId/admin/invites/:inviteId
Authorization: Bearer <token>
Roles: owner, admin
```

### Change Member Role
```http
POST /organization/:organizationId/admin/members/:userId/role
Authorization: Bearer <token>
Roles: owner

{
  "roleKey": "admin"  // owner | admin | member | guest
}
```

### Remove Member
```http
DELETE /organization/:organizationId/admin/members/:userId
Authorization: Bearer <token>
Roles: owner
```

### Get Organization Details
```http
GET /organization/:organizationId/admin/organization
Authorization: Bearer <token>
Roles: owner, admin, member
```

## 💳 Billing Endpoints

### Get Subscription
```http
GET /billing/organization/:organizationId
Authorization: Bearer <token>
Roles: owner, admin, member
```

### Create Subscription
```http
POST /billing/organization/:organizationId/subscribe
Authorization: Bearer <token>
Roles: owner, admin

{
  "priceId": "price_1ABC..."  // Stripe Price ID
}
```

### Cancel Subscription
```http
POST /billing/organization/:organizationId/cancel
Authorization: Bearer <token>
Roles: owner

{
  "immediate": false  // true = cancel now, false = at period end
}
```

### Get Billing Portal
```http
POST /billing/organization/:organizationId/portal
Authorization: Bearer <token>
Roles: owner, admin

{
  "returnUrl": "http://localhost:5173/settings/billing"
}
```

## 🎣 Webhook Endpoint

### Stripe Webhook
```http
POST /webhooks/stripe
Headers:
  stripe-signature: <signature>

Handles: customer.subscription.*, invoice.paid, invoice.payment_failed
```

## 🎭 Role Hierarchy

| Role    | Permissions                                      |
|---------|--------------------------------------------------|
| Owner   | All permissions, cannot be removed               |
| Admin   | Invite/manage members, view billing              |
| Member  | Access projects and tasks                        |
| Guest   | Read-only access                                 |

## 📝 Testing with cURL

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.com","password":"password123"}' \
  | jq -r '.access_token')

# List members
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/organization/ORG_ID/admin/members

# Invite member
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@user.com","roleKey":"member"}' \
  http://localhost:3001/organization/ORG_ID/admin/invite

# Change role
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleKey":"admin"}' \
  http://localhost:3001/organization/ORG_ID/admin/members/USER_ID/role

# Get subscription
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/billing/organization/ORG_ID
```

## 🧪 Testing with PowerShell

Run the comprehensive test suite:

```powershell
cd c:\My Projects\Workflow management\workflow-platform
.\test-admin-billing.ps1
```

This script tests:
- ✅ User registration (owner & member)
- ✅ Organization creation
- ✅ Member listing
- ✅ Invite creation & acceptance
- ✅ Role changes
- ✅ Invite revocation
- ✅ RBAC enforcement
- ✅ Subscription retrieval

## 🔒 Security Notes

1. **Owner Protection**: Cannot remove or demote organization owner
2. **Role Validation**: Only valid roleKeys accepted (owner/admin/member/guest)
3. **Invite Expiry**: Tokens expire after 7 days
4. **Webhook Security**: Stripe signature verification required
5. **Cascade Deletes**: Removing member cleans up related data
6. **Activity Logging**: All admin actions logged with actorId

## 🐛 Common Errors

### 403 Forbidden - "Insufficient permissions"
- User doesn't have required role for the endpoint
- Check roleKey in OrganizationMember table

### 403 Forbidden - "Organization context required"
- organizationId not found in request
- Ensure organizationId in URL params

### 404 Not Found - "Member not found"
- User is not a member of the organization
- Check OrganizationMember records

### 400 Bad Request - "User is already a member"
- Cannot invite existing member
- Use role change endpoint instead

### 400 Bad Request - "Invite already used"
- Token has been accepted
- Generate new invite if needed

### 400 Bad Request - "Invite expired"
- Token older than 7 days
- Create new invite

## 📊 Database Queries

```sql
-- Check user roles in organization
SELECT u.email, om.roleKey, om.createdAt
FROM "OrganizationMember" om
JOIN "User" u ON om."userId" = u.id
WHERE om."organizationId" = 'org_id';

-- View pending invites
SELECT email, roleKey, token, expiresAt
FROM "InviteToken"
WHERE "organizationId" = 'org_id'
  AND "usedAt" IS NULL
  AND "expiresAt" > NOW();

-- Check subscription status
SELECT planKey, status, currentPeriodEnd
FROM "Subscription"
WHERE "organizationId" = 'org_id';

-- View admin activity log
SELECT type, metadata, createdAt
FROM "Activity"
WHERE "organizationId" = 'org_id'
  AND type LIKE '%member%' OR type LIKE '%role%'
ORDER BY createdAt DESC
LIMIT 20;
```
