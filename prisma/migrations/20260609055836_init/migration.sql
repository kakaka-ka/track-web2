-- CreateTable
CREATE TABLE "Carrier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "carrierId" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateEvent" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "offsetHours" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" SERIAL NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "carrierId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusDetail" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "note" TEXT,
    "orderId" TEXT,
    "buyerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_name_key" ON "Carrier"("name");
CREATE UNIQUE INDEX "Carrier_code_key" ON "Carrier"("code");
CREATE UNIQUE INDEX "Package_trackingNumber_key" ON "Package"("trackingNumber");
CREATE INDEX "Package_trackingNumber_idx" ON "Package"("trackingNumber");
CREATE INDEX "Package_status_idx" ON "Package"("status");
CREATE INDEX "Package_createdAt_idx" ON "Package"("createdAt");
CREATE INDEX "TrackingEvent_packageId_idx" ON "TrackingEvent"("packageId");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TemplateEvent" ADD CONSTRAINT "TemplateEvent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Package" ADD CONSTRAINT "Package_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
