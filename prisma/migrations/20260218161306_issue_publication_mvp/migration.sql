-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "issueId" TEXT;

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "issueNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issue_journalId_publishedAt_idx" ON "Issue"("journalId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_journalId_volume_issueNumber_year_key" ON "Issue"("journalId", "volume", "issueNumber", "year");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
