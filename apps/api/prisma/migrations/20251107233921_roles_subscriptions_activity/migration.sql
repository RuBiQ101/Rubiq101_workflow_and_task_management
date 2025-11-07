-- Step 1: Add new columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Step 2: Add new column to Organization (nullable for now)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- Step 3: Migrate roleKey from role column in OrganizationMember
ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "roleKey" TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Copy existing role data to roleKey (only if role column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OrganizationMember' AND column_name = 'role') THEN
    UPDATE "OrganizationMember" SET "roleKey" = "role";
    ALTER TABLE "OrganizationMember" DROP COLUMN "role";
  END IF;
END $$;

-- Step 4: Set ownerId for existing organizations (only where NULL)
WITH FirstMember AS (
  SELECT DISTINCT ON (om."organizationId")
    om."organizationId",
    om."userId"
  FROM "OrganizationMember" om
  ORDER BY om."organizationId", om."createdAt" ASC
)
UPDATE "Organization" o
SET "ownerId" = fm."userId"
FROM FirstMember fm
WHERE o.id = fm."organizationId"
  AND o."ownerId" IS NULL;

-- Update the roleKey for owners
UPDATE "OrganizationMember" om
SET "roleKey" = 'owner'
FROM "Organization" o
WHERE om."organizationId" = o.id
  AND om."userId" = o."ownerId"
  AND om."roleKey" != 'owner';

-- Step 6: Add actorId foreign key to Activity table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Activity_actorId_fkey') THEN
    ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" 
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 7: Create RoleDefinition table
CREATE TABLE IF NOT EXISTS "RoleDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoleDefinition_key_key" ON "RoleDefinition"("key");

-- Insert default roles (if not exists)
INSERT INTO "RoleDefinition" ("id", "key", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'owner', 'Owner', 'Full control over the organization', 
   '{"all": true}'::jsonb, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RoleDefinition" WHERE "key" = 'owner');

INSERT INTO "RoleDefinition" ("id", "key", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'admin', 'Administrator', 'Manage members and settings', 
   '{"members": ["read", "write", "delete"], "billing": ["read", "write"], "settings": ["read", "write"]}'::jsonb, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RoleDefinition" WHERE "key" = 'admin');

INSERT INTO "RoleDefinition" ("id", "key", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'member', 'Member', 'Standard access to projects and tasks', 
   '{"projects": ["read", "write"], "tasks": ["read", "write", "delete"]}'::jsonb, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RoleDefinition" WHERE "key" = 'member');

INSERT INTO "RoleDefinition" ("id", "key", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'guest', 'Guest', 'Read-only access', 
   '{"projects": ["read"], "tasks": ["read"]}'::jsonb, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RoleDefinition" WHERE "key" = 'guest');

-- Step 8: Create Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "planKey" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_key" ON "Subscription"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_planKey_idx" ON "Subscription"("planKey");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_organizationId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" 
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create free subscriptions for existing organizations (if not exists)
INSERT INTO "Subscription" ("id", "organizationId", "planKey", "status", "updatedAt")
SELECT gen_random_uuid()::text, o.id, 'free', 'active', CURRENT_TIMESTAMP
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s WHERE s."organizationId" = o.id
);

-- Step 9: Create InviteToken table
CREATE TABLE IF NOT EXISTS "InviteToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token");
CREATE INDEX IF NOT EXISTS "InviteToken_organizationId_idx" ON "InviteToken"("organizationId");
CREATE INDEX IF NOT EXISTS "InviteToken_email_idx" ON "InviteToken"("email");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InviteToken_organizationId_fkey') THEN
    ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_organizationId_fkey" 
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 10: Reorganize Activity indexes
DROP INDEX IF EXISTS "Activity_createdAt_idx";
CREATE INDEX IF NOT EXISTS "Activity_organizationId_createdAt_idx" ON "Activity"("organizationId", "createdAt");

-- Step 11: Add indexes to OrganizationMember
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
