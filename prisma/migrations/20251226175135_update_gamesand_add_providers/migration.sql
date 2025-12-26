/*
  Warnings:

  - You are about to drop the column `provider` on the `games` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[game_code,provider_id]` on the table `games` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `provider_id` to the `games` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "games_game_code_key";

-- DropIndex
DROP INDEX "games_game_code_provider_name_id_idx";

-- AlterTable
ALTER TABLE "games" DROP COLUMN "provider",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "distribution" TEXT,
ADD COLUMN     "game_id" INTEGER,
ADD COLUMN     "game_original_code" TEXT,
ADD COLUMN     "game_server_url" TEXT,
ADD COLUMN     "game_type" TEXT,
ADD COLUMN     "has_freespins" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_lobby" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_tables" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_mobile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "only_demo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_code_oneapi" TEXT,
ADD COLUMN     "original_code_tbs" TEXT,
ADD COLUMN     "provider_code" TEXT,
ADD COLUMN     "provider_id" INTEGER NOT NULL,
ADD COLUMN     "rtp" DECIMAL(5,2),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "technology" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "image" DROP NOT NULL;

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_name_key" ON "providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE INDEX "games_game_code_provider_id_idx" ON "games"("game_code", "provider_id");

-- CreateIndex
CREATE INDEX "games_provider_id_idx" ON "games"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_game_code_provider_id_key" ON "games"("game_code", "provider_id");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
