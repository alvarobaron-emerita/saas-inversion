-- AlterTable
ALTER TABLE "SearchColumn" ADD COLUMN IF NOT EXISTS "inputColumnIds" JSONB;
ALTER TABLE "SearchColumn" ADD COLUMN IF NOT EXISTS "useOnlyRelevant" BOOLEAN NOT NULL DEFAULT false;
