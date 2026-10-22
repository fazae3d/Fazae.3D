-- AlterTable
ALTER TABLE "WaCadence" ADD COLUMN     "audience" JSONB,
ADD COLUMN     "autoEnroll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repeatAfterDays" INTEGER,
ADD COLUMN     "sendDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
ADD COLUMN     "windowEndHour" INTEGER,
ADD COLUMN     "windowStartHour" INTEGER;

-- AlterTable
ALTER TABLE "WaEnrollment" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "rounds" INTEGER NOT NULL DEFAULT 1;

