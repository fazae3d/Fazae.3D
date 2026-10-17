-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "freeShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shippingOriginal" DOUBLE PRECISION NOT NULL DEFAULT 0;

