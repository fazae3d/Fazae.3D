-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "pixDepositPct" INTEGER,
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "cardSurcharge" DOUBLE PRECISION,
ADD COLUMN "cardInstallments" INTEGER;
