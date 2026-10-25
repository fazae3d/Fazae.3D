-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "lostNote" TEXT,
ADD COLUMN     "lostReason" TEXT;

