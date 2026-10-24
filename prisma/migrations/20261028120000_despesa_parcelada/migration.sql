-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "installments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "firstDueDate" TIMESTAMP(3);
