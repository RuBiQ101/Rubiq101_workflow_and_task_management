-- CreateTable
CREATE TABLE "PageToken" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "description" TEXT,
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PageToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageToken_token_key" ON "PageToken"("token");

-- CreateIndex
CREATE INDEX "PageToken_orgId_idx" ON "PageToken"("orgId");

-- CreateIndex
CREATE INDEX "PageToken_token_idx" ON "PageToken"("token");
