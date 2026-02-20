-- CreateTable
CREATE TABLE "SearchView" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SearchView_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SearchView" ADD CONSTRAINT "SearchView_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
