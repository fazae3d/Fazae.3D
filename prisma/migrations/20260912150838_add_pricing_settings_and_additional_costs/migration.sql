-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "averageFailureRatePct" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "defaultMaterialCostPerGram" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "defaultProfitMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
ADD COLUMN     "energyCostPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "printerCostPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdditionalCost" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AdditionalCost_pkey" PRIMARY KEY ("id")
);
