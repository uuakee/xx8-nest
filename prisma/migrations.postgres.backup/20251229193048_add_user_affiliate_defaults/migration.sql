/*
  Warnings:

  - You are about to drop the column `min_withdrawal` on the `default_affiliate_bonuses` table. All the data in the column will be lost.
  - You are about to drop the column `possibility_bonus` on the `default_affiliate_bonuses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "default_affiliate_bonuses" DROP COLUMN "min_withdrawal",
DROP COLUMN "possibility_bonus";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fake_revshare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revshare_fake" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "revshare_level_1" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "revshare_level_2" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "revshare_level_3" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
