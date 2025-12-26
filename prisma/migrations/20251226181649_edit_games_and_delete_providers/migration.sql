/*
  Warnings:

  - You are about to drop the column `game_original_code` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `game_server_url` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `has_freespins` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `has_tables` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `is_featured` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `is_mobile` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `only_demo` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `original_code_oneapi` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `original_code_tbs` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `provider_code` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `provider_id` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `technology` on the `games` table. All the data in the column will be lost.
  - You are about to drop the `providers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "games" DROP CONSTRAINT "games_provider_id_fkey";

-- DropIndex
DROP INDEX "games_game_code_provider_id_idx";

-- DropIndex
DROP INDEX "games_game_code_provider_id_key";

-- DropIndex
DROP INDEX "games_provider_id_idx";

-- AlterTable
ALTER TABLE "games" DROP COLUMN "game_original_code",
DROP COLUMN "game_server_url",
DROP COLUMN "has_freespins",
DROP COLUMN "has_tables",
DROP COLUMN "is_featured",
DROP COLUMN "is_mobile",
DROP COLUMN "only_demo",
DROP COLUMN "original_code_oneapi",
DROP COLUMN "original_code_tbs",
DROP COLUMN "provider_code",
DROP COLUMN "provider_id",
DROP COLUMN "technology";

-- DropTable
DROP TABLE "providers";
