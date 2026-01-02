-- AlterTable
ALTER TABLE "reedem_code_histories" ADD COLUMN     "bonus" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "free_spins" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "reedem_codes" ADD COLUMN     "bonus" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "free_spins" INTEGER DEFAULT 0;
