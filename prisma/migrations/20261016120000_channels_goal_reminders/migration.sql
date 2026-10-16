-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SaleChannel" ADD VALUE 'mercado_livre';
ALTER TYPE "SaleChannel" ADD VALUE 'shopee';
ALTER TYPE "SaleChannel" ADD VALUE 'tiktok_shop';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "lastReminderAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "lastFollowUpAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "channelFees" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "monthlyGoal" DOUBLE PRECISION NOT NULL DEFAULT 0;

