-- CreateTable
CREATE TABLE "SearchSettings" (
    "id" TEXT NOT NULL,
    "defaultColumns" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "SearchSettings_pkey" PRIMARY KEY ("id")
);
