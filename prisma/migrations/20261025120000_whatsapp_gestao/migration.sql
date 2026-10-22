-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WaConfig" ADD COLUMN     "awayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "awayText" TEXT,
ADD COLUMN     "greetingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "greetingText" TEXT,
ADD COLUMN     "lastWebhookAt" TIMESTAMP(3),
ADD COLUMN     "orderNotifyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderTemplates" JSONB,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedReason" TEXT;

-- AlterTable
ALTER TABLE "WaConversation" ADD COLUMN     "hasWhatsapp" BOOLEAN,
ADD COLUMN     "lastAutoReplyAt" TIMESTAMP(3),
ADD COLUMN     "lastDirection" TEXT,
ADD COLUMN     "nextActionAt" TIMESTAMP(3),
ADD COLUMN     "nextActionNote" TEXT;

-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "cadenceId" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "ref" TEXT,
ADD COLUMN     "stepIndex" INTEGER;

-- CreateTable
CREATE TABLE "WaQuickReply" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaQuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaQuickReply_shortcut_key" ON "WaQuickReply"("shortcut");

-- CreateIndex
CREATE INDEX "WaConversation_lastDirection_idx" ON "WaConversation"("lastDirection");

-- CreateIndex
CREATE INDEX "WaConversation_nextActionAt_idx" ON "WaConversation"("nextActionAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaMessage_ref_key" ON "WaMessage"("ref");

-- CreateIndex
CREATE INDEX "WaMessage_cadenceId_idx" ON "WaMessage"("cadenceId");

