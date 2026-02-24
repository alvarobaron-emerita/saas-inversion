-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "context" TEXT,
    "report" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchView" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SearchView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inbox',
    "data" JSONB NOT NULL,

    CONSTRAINT "SearchRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchColumn" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "header" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT,
    "formula" TEXT,
    "inputColumnIds" JSONB,
    "useOnlyRelevant" BOOLEAN NOT NULL DEFAULT false,
    "outputStyle" TEXT,
    "pairColumnId" TEXT,
    "width" INTEGER,
    "pinned" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SearchColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "thesis" TEXT NOT NULL DEFAULT '',
    "kpis" JSONB NOT NULL DEFAULT '[]',
    "reportSections" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "SearchView" ADD CONSTRAINT "SearchView_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchRow" ADD CONSTRAINT "SearchRow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchColumn" ADD CONSTRAINT "SearchColumn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

