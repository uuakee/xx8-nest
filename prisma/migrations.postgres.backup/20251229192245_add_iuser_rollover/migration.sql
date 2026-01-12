-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rollover_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rollover_multiplier" DECIMAL(10,2) NOT NULL DEFAULT 1.00;
