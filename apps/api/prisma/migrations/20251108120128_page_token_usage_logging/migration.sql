-- CreateTable
CREATE TABLE "PageTokenUsage" (
    "id" TEXT NOT NULL,
    "pageTokenId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageTokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageTokenUsage_pageTokenId_idx" ON "PageTokenUsage"("pageTokenId");

-- CreateIndex
CREATE INDEX "PageTokenUsage_origin_idx" ON "PageTokenUsage"("origin");

-- AddForeignKey
ALTER TABLE "PageTokenUsage" ADD CONSTRAINT "PageTokenUsage_pageTokenId_fkey" FOREIGN KEY ("pageTokenId") REFERENCES "PageToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
