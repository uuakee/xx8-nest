/*
  Warnings:

  - Added the required column `icon_url` to the `promotions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "icon_url" TEXT NOT NULL;
