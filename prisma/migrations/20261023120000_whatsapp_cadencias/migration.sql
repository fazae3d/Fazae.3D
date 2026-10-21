-- AlterTable
ALTER TABLE "WaCadence" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'personalizada';

-- AlterTable
ALTER TABLE "WaEnrollment" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WaConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "autoSendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyLimit" INTEGER NOT NULL DEFAULT 100,
    "windowStartHour" INTEGER NOT NULL DEFAULT 8,
    "windowEndHour" INTEGER NOT NULL DEFAULT 18,

    CONSTRAINT "WaConfig_pkey" PRIMARY KEY ("id")
);

