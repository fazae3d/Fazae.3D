-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "remindedAt" TIMESTAMP(3),

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCart_email_key" ON "AbandonedCart"("email");

-- CreateIndex
CREATE INDEX "AbandonedCart_remindedAt_idx" ON "AbandonedCart"("remindedAt");
