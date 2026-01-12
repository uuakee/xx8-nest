/*
  Warnings:

  - You are about to drop the column `avatar` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[affiliate_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar",
ADD COLUMN     "invited_by_user_id" INTEGER;

-- CreateIndex
CREATE INDEX "chest_withdrawls_chest_id_idx" ON "chest_withdrawls"("chest_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_affiliate_code_key" ON "users"("affiliate_code");

-- CreateIndex
CREATE INDEX "users_invited_by_user_id_idx" ON "users"("invited_by_user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chest_withdrawls" ADD CONSTRAINT "chest_withdrawls_chest_id_fkey" FOREIGN KEY ("chest_id") REFERENCES "chests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
