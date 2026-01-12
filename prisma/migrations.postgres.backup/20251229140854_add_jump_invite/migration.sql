-- AlterTable
ALTER TABLE "users" ADD COLUMN     "jump_available" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jump_invite_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jump_limit" INTEGER NOT NULL DEFAULT 2;
