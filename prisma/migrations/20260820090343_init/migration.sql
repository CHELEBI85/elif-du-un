-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coupleName" TEXT NOT NULL,
    "brideName" TEXT NOT NULL,
    "groomName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "coverImage" TEXT,
    "coverPublicId" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 7,
    "expiresAt" TIMESTAMP(3),
    "uploadEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "originalFilename" TEXT,
    "format" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploaderSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_tickets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleanup_logs" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventsProcessed" INTEGER NOT NULL DEFAULT 0,
    "photosDeleted" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,

    CONSTRAINT "cleanup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_expiresAt_idx" ON "events"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "photos_publicId_key" ON "photos"("publicId");

-- CreateIndex
CREATE INDEX "photos_eventId_createdAt_idx" ON "photos"("eventId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "photos_eventId_uploaderSessionId_idx" ON "photos"("eventId", "uploaderSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "upload_tickets_publicId_key" ON "upload_tickets"("publicId");

-- CreateIndex
CREATE INDEX "upload_tickets_eventId_sessionId_idx" ON "upload_tickets"("eventId", "sessionId");

-- CreateIndex
CREATE INDEX "upload_tickets_expiresAt_idx" ON "upload_tickets"("expiresAt");

-- CreateIndex
CREATE INDEX "cleanup_logs_runAt_idx" ON "cleanup_logs"("runAt" DESC);

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_tickets" ADD CONSTRAINT "upload_tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
