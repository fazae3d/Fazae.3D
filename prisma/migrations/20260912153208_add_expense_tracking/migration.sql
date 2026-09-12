-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('equipamento', 'material', 'embalagem', 'operacional');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unitValue" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_purchaseDate_idx" ON "Expense"("purchaseDate");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");
