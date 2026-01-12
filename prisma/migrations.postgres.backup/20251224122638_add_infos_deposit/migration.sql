/*
  Warnings:

  - Added the required column `updated_at` to the `deposits` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "deposits_user_id_created_at_idx";

-- AlterTable
ALTER TABLE "deposits" ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "deposits_user_id_created_at_status_reference_idx" ON "deposits"("user_id", "created_at", "status", "reference");
