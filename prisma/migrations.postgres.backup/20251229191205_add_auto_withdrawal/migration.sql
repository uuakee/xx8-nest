-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "auto_withdrawal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "auto_withdrawal_limit" DECIMAL(10,2) NOT NULL DEFAULT 5000.00;
