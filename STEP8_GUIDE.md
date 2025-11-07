# Step 8: Access Control, Billing & Admin Features

This guide covers the implementation of enterprise features including role-based access control, Stripe subscriptions, and admin APIs.

## 🔐 Access Control (RBAC)

### Role Definitions

Four pre-defined roles with hierarchical permissions:

| Role    | Key      | Description                          | Permissions                                      |
|---------|----------|--------------------------------------|--------------------------------------------------|
| Owner   | `owner`  | Full control over organization       | All permissions                                  |
| Admin   | `admin`  | Manage members and settings          | Members (R/W/D), Billing (R/W), Settings (R/W)  |
| Member  | `member` | Standard access                      | Projects (R/W), Tasks (R/W/D)                   |
| Guest   | `guest`  | Read-only access                     | Projects (R), Tasks (R)                         |

### Usage in Controllers

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller('organization/:organizationId/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  
  @Post('invite')
  @Roles('owner', 'admin')  // Only owners and admins can invite
  async inviteMember(@Param('organizationId') orgId: string) {
    // ...
  }

  @Delete('members/:userId')
  @Roles('owner')  // Only owners can remove members
  async removeMember() {
    // ...
  }
}
```

### How It Works

1. **@Roles Decorator**: Marks endpoints with required roles
2. **RolesGuard**: 
   - Extracts `organizationId` from request (params/body/query)
   - Queries `OrganizationMember` to verify user membership
   - Checks if user's `roleKey` matches required roles
   - Throws `ForbiddenException` if insufficient permissions

```typescript
// Example: RolesGuard flow
const requiredRoles = ['owner', 'admin'];
const membership = await prisma.organizationMember.findFirst({
  where: { organizationId: orgId, userId: user.id }
});

if (requiredRoles.includes(membership.roleKey)) {
  return true;  // Access granted
}
throw new ForbiddenException('Insufficient permissions');
```

## 💳 Billing Integration (Stripe)

### Environment Variables

```env
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

### Subscription Model

- **Plans**: `free`, `pro`, `enterprise`
- **Statuses**: `active`, `trialing`, `past_due`, `canceled`, `incomplete`
- Each organization has one subscription (one-to-one relation)

### API Endpoints

#### Create Subscription
```bash
POST /billing/organization/:organizationId/subscribe
Authorization: Bearer <jwt>

{
  "priceId": "price_1ABC..." # Stripe Price ID
}
```

#### Cancel Subscription
```bash
POST /billing/organization/:organizationId/cancel
Authorization: Bearer <jwt>

{
  "immediate": false  # true = cancel now, false = at period end
}
```

#### Get Billing Portal
```bash
POST /billing/organization/:organizationId/portal
Authorization: Bearer <jwt>

{
  "returnUrl": "http://localhost:5173/settings/billing"
}

Response:
{
  "url": "https://billing.stripe.com/session/..."
}
```

#### Get Subscription
```bash
GET /billing/organization/:organizationId
Authorization: Bearer <jwt>

Response:
{
  "id": "sub_...",
  "planKey": "pro",
  "status": "active",
  "currentPeriodEnd": "2025-12-07T...",
  "cancelAtPeriodEnd": false
}
```

### Webhook Handling

The webhook endpoint (`POST /webhooks/stripe`) handles real-time subscription updates from Stripe.

**Supported Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Setup Webhook in Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/webhooks/stripe`
3. Select events to send
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Testing Stripe

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

## 🛠️ Admin APIs

### Invite Member

```bash
POST /organization/:organizationId/admin/invite
Authorization: Bearer <jwt>
Roles: owner, admin

{
  "email": "newuser@example.com",
  "roleKey": "member"
}

Response:
{
  "inviteId": "inv_...",
  "email": "newuser@example.com",
  "roleKey": "member",
  "token": "abc123...",
  "expiresAt": "2025-11-14T...",
  "inviteUrl": "http://localhost:5173/invite/abc123..."
}
```

### Accept Invite

```bash
POST /organization/:organizationId/admin/invite/:token/accept
Authorization: Bearer <jwt>

Response:
{
  "member": { ... },
  "organization": { ... }
}
```

### List Invites

```bash
GET /organization/:organizationId/admin/invites
Authorization: Bearer <jwt>
Roles: owner, admin

Response:
[
  {
    "id": "inv_...",
    "email": "pending@example.com",
    "roleKey": "member",
    "token": "abc123...",
    "expiresAt": "2025-11-14T...",
    "createdAt": "2025-11-07T..."
  }
]
```

### Revoke Invite

```bash
DELETE /organization/:organizationId/admin/invites/:inviteId
Authorization: Bearer <jwt>
Roles: owner, admin
```

### Change Member Role

```bash
POST /organization/:organizationId/admin/members/:userId/role
Authorization: Bearer <jwt>
Roles: owner

{
  "roleKey": "admin"
}

Response:
{
  "id": "mem_...",
  "userId": "user_...",
  "organizationId": "org_...",
  "roleKey": "admin",
  "user": { ... }
}
```

### List Members

```bash
GET /organization/:organizationId/admin/members
Authorization: Bearer <jwt>
Roles: owner, admin, member

Response:
[
  {
    "id": "mem_...",
    "userId": "user_...",
    "organizationId": "org_...",
    "roleKey": "owner",
    "createdAt": "2025-11-07T...",
    "user": {
      "id": "user_...",
      "email": "owner@example.com",
      "username": "johndoe"
    }
  }
]
```

### Remove Member

```bash
DELETE /organization/:organizationId/admin/members/:userId
Authorization: Bearer <jwt>
Roles: owner

Response:
{
  "success": true
}
```

### Get Organization Details

```bash
GET /organization/:organizationId/admin/organization
Authorization: Bearer <jwt>
Roles: owner, admin, member

Response:
{
  "id": "org_...",
  "name": "My Organization",
  "ownerId": "user_...",
  "members": [...],
  "subscription": { ... }
}
```

## 📊 Activity Logging

All admin actions are automatically logged to the `Activity` table:

- `member.invited` - User invited to organization
- `member.joined` - User accepted invite
- `role.changed` - Member role updated
- `member.removed` - Member removed from organization
- `invite.revoked` - Invite token revoked

**Activity Structure:**
```typescript
{
  type: 'role.changed',
  actorId: 'user_abc',  // Who performed the action
  organizationId: 'org_123',
  metadata: {
    targetUserId: 'user_xyz',
    targetEmail: 'user@example.com',
    oldRole: 'member',
    newRole: 'admin'
  },
  createdAt: '2025-11-07T...'
}
```

## 🔍 Database Schema Changes

### New Models

**RoleDefinition** - Define available roles and permissions
```prisma
model RoleDefinition {
  id          String   @id @default(cuid())
  key         String   @unique  // 'owner', 'admin', 'member', 'guest'
  name        String
  description String?
  permissions Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Subscription** - Track billing subscriptions
```prisma
model Subscription {
  id                    String    @id @default(cuid())
  organizationId        String    @unique
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique
  planKey               String    @default("free")
  status                String    @default("active")
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean   @default(false)
  trialEndsAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

**InviteToken** - Manage member invitations
```prisma
model InviteToken {
  id             String    @id @default(cuid())
  email          String
  organizationId String
  roleKey        String    @default("member")
  token          String    @unique
  expiresAt      DateTime
  usedAt         DateTime?
  createdAt      DateTime  @default(now())
}
```

### Modified Models

**User**
- Added `username` field (optional)
- Added `activities` relation

**Organization**
- Added `ownerId` field (optional for migration)
- Added `subscription` relation (one-to-one)

**OrganizationMember**
- Changed `role` → `roleKey` (string)
- Added `updatedAt` timestamp
- Added indexes on `organizationId` and `userId`
- Cascade delete when organization or user deleted

**Activity**
- Added `actor` relation (User who performed action)
- Reorganized indexes for better performance

## 🚀 Frontend Implementation

### Admin Page Structure

```jsx
// apps/web/src/pages/AdminPage.jsx
import { useState } from 'react';
import { Tabs } from '../components/Tabs';

function AdminPage({ organizationId }) {
  const [activeTab, setActiveTab] = useState('members');

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>
      
      <Tabs active={activeTab} onChange={setActiveTab}>
        <Tab value="members">
          <MembersTab organizationId={organizationId} />
        </Tab>
        <Tab value="billing">
          <BillingTab organizationId={organizationId} />
        </Tab>
        <Tab value="activity">
          <ActivityTab organizationId={organizationId} />
        </Tab>
      </Tabs>
    </div>
  );
}
```

### Members Tab

```jsx
function MembersTab({ organizationId }) {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const handleInvite = async () => {
    const res = await fetch(`/api/organization/${organizationId}/admin/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: inviteEmail, roleKey: inviteRole })
    });
    const data = await res.json();
    alert(`Invite sent! URL: ${data.inviteUrl}`);
  };

  return (
    <div>
      {/* Invite form */}
      <div className="mb-6">
        <input 
          placeholder="Email" 
          value={inviteEmail} 
          onChange={e => setInviteEmail(e.target.value)}
        />
        <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="guest">Guest</option>
        </select>
        <button onClick={handleInvite}>Send Invite</button>
      </div>

      {/* Members list */}
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              <td>{member.user.email}</td>
              <td>{member.user.username || '-'}</td>
              <td>
                <select 
                  value={member.roleKey}
                  onChange={e => handleRoleChange(member.userId, e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Guest</option>
                </select>
              </td>
              <td>
                <button onClick={() => handleRemove(member.userId)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Billing Tab

```jsx
function BillingTab({ organizationId }) {
  const [subscription, setSubscription] = useState(null);

  const handleUpgrade = async (priceId) => {
    await fetch(`/api/billing/organization/${organizationId}/subscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ priceId })
    });
  };

  const handlePortal = async () => {
    const res = await fetch(`/api/billing/organization/${organizationId}/portal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ returnUrl: window.location.href })
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div>
      <h2>Current Plan: {subscription?.planKey}</h2>
      <p>Status: {subscription?.status}</p>
      
      {subscription?.planKey === 'free' && (
        <button onClick={() => handleUpgrade('price_pro_monthly')}>
          Upgrade to Pro
        </button>
      )}
      
      <button onClick={handlePortal}>Manage Billing</button>
    </div>
  );
}
```

## 🧪 Testing Checklist

### Access Control
- [ ] Non-owner cannot remove members
- [ ] Guest role cannot modify projects
- [ ] Admin can invite but not change owner role
- [ ] Guard correctly extracts orgId from params/body/query
- [ ] Proper error messages for insufficient permissions

### Billing
- [ ] Subscription created with Stripe
- [ ] Webhook updates subscription status
- [ ] Cancellation works (immediate and at period end)
- [ ] Portal URL redirects correctly
- [ ] Free plan assigned to new organizations

### Admin Operations
- [x] Invite generates unique token
- [x] Accept invite creates membership
- [x] **Invite emails sent via SendGrid** ✨ NEW
- [x] **Frontend invite acceptance pages** ✨ NEW
- [x] Expired invites cannot be used
- [x] Role changes logged to Activity
- [x] Owner cannot be removed
- [x] All admin actions logged

## 📧 Email Integration (NEW)

### SendGrid Setup

The invite system now includes automatic email delivery!

**Environment Variables:**
```env
SENDGRID_API_KEY=SG.your_api_key_here
MAIL_FROM=YourApp <no-reply@yourapp.com>
APP_URL=http://localhost:5173
INVITE_EMAIL_DEV_ECHO=true  # Dev mode for testing
```

**Email Features:**
- Professional HTML template with organization name
- Big "Accept invite" CTA button
- Mobile-responsive design
- Automatic sending on invite creation
- Graceful error handling (invite created even if email fails)

**Dev Mode:**
Set `INVITE_EMAIL_DEV_ECHO=true` to get invite URL in API response for testing without email delivery.

**Complete Documentation:** See `EMAIL_SETUP_GUIDE.md` for:
- SendGrid account setup
- Email template customization
- Frontend invite acceptance pages
- Testing procedures
- Production deployment

**Test Script:** Run `.\test-invite-email.ps1` to test the complete flow.

## 🔒 Security Notes

1. **Webhook Verification**: Always verify Stripe signature
2. **Token Security**: InviteToken should be random and unpredictable
3. **Owner Protection**: Prevent owner removal/demotion
4. **Cascade Deletes**: Properly configured for data integrity
5. **Activity Logging**: All sensitive operations tracked

## 📈 Next Steps

- [x] ✅ **Email templates for invites** (SendGrid integration complete!)
- [x] ✅ **Frontend invite acceptance pages** (React components ready!)
- [ ] Implement granular permissions (beyond simple roleKey)
- [ ] Add audit log UI in admin panel
- [ ] Add usage-based billing with Stripe metering
- [ ] Implement role templates for custom roles
- [ ] Add 2FA for owner accounts
- [ ] Bulk invite functionality (CSV upload)
- [ ] Resend invite functionality
- [ ] Invite expiry warnings

## 📚 Additional Documentation

- **EMAIL_SETUP_GUIDE.md** - Complete email integration guide
- **INVITE_EMAIL_IMPLEMENTATION.md** - Implementation summary
- **API_REFERENCE.md** - Quick API reference with examples
- **test-invite-email.ps1** - Automated testing script
