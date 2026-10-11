-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProductionItem" ADD COLUMN "stockAddedQty" INTEGER NOT NULL DEFAULT 0;
