-- CreateTable
CREATE TABLE "WaConversation" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT NOT NULL DEFAULT 'entrada',
    "stage" TEXT NOT NULL DEFAULT 'novo',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "lastPreview" TEXT,
    "lastInboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mediaType" TEXT,
    "providerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaCadence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaCadence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaEnrollment" (
    "id" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "stopReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaConversation_phone_key" ON "WaConversation"("phone");

-- CreateIndex
CREATE INDEX "WaConversation_lastMessageAt_idx" ON "WaConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "WaConversation_stage_idx" ON "WaConversation"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "WaMessage_providerId_key" ON "WaMessage"("providerId");

-- CreateIndex
CREATE INDEX "WaMessage_conversationId_createdAt_idx" ON "WaMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "WaMessage_createdAt_idx" ON "WaMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WaEnrollment_status_nextRunAt_idx" ON "WaEnrollment"("status", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaEnrollment_cadenceId_conversationId_key" ON "WaEnrollment"("cadenceId", "conversationId");

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaEnrollment" ADD CONSTRAINT "WaEnrollment_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "WaCadence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaEnrollment" ADD CONSTRAINT "WaEnrollment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

