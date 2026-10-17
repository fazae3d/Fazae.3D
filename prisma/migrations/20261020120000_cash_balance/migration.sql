-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "cashBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cashBalanceDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrderPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderPayment_orderId_idx" ON "OrderPayment"("orderId");

-- CreateIndex
CREATE INDEX "OrderPayment_paidAt_idx" ON "OrderPayment"("paidAt");

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

