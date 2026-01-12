/*
  Warnings:

  - You are about to drop the column `client_id` on the `prada_payments` table. All the data in the column will be lost.
  - You are about to drop the column `client_secret` on the `prada_payments` table. All the data in the column will be lost.
  - Added the required column `api_key` to the `prada_payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "prada_payments" DROP COLUMN "client_id",
DROP COLUMN "client_secret",
ADD COLUMN     "api_key" TEXT NOT NULL;
