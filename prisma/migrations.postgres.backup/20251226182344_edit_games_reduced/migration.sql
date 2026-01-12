/*
  Warnings:

  - You are about to drop the column `has_lobby` on the `games` table. All the data in the column will be lost.
  - The `game_type` column on the `games` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('SLOTS', 'FISHING', 'CASINO');

-- AlterTable
ALTER TABLE "games" DROP COLUMN "has_lobby",
ADD COLUMN     "currency" TEXT DEFAULT 'BRL',
DROP COLUMN "game_type",
ADD COLUMN     "game_type" "GameType";
