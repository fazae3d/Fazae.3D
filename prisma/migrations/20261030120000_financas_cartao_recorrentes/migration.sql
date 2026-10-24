-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "cardName" TEXT,
ADD COLUMN     "installmentAmounts" JSONB,
ADD COLUMN     "paymentMethod" TEXT;

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "startMonth" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedMonth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

