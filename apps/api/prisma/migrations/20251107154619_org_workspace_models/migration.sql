/*
  Warnings:

  - You are about to drop the column `createdById` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Workspace` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `Workspace` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable for Organization first
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable for OrganizationMember
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- Create a default organization for existing data
INSERT INTO "Organization" ("id", "name", "description", "createdAt", "updatedAt")
VALUES ('default_org_id', 'Default Organization', 'Migrated from existing workspaces', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add the demo user to the default organization as owner
INSERT INTO "OrganizationMember" ("id", "userId", "organizationId", "role", "createdAt")
SELECT 
    'default_member_' || "id",
    "id",
    'default_org_id',
    'owner',
    CURRENT_TIMESTAMP
FROM "User"
WHERE "email" = 'demo@local.test';

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_ownerId_fkey";

-- AlterTable - Drop ownerId and add organizationId with default
ALTER TABLE "Workspace" DROP COLUMN "ownerId";
ALTER TABLE "Workspace" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default_org_id';

-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "createdById";

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
