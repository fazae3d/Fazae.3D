-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "packageHeightCm" DOUBLE PRECISION,
ADD COLUMN     "packageLengthCm" DOUBLE PRECISION,
ADD COLUMN     "packageWidthCm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "originCep" TEXT;
