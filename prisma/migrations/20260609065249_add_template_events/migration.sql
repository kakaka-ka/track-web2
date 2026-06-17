-- CreateTable
CREATE TABLE "TemplateEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "templateId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "offsetHours" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TemplateEvent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
