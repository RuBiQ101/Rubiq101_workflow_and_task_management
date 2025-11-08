-- AlterTable
ALTER TABLE "ProjectTask" ADD COLUMN     "columnKey" TEXT NOT NULL DEFAULT 'todo',
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
