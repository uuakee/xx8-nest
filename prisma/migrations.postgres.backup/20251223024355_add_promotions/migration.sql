-- AlterTable
ALTER TABLE "vip_histories" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'upgrade';

-- AlterTable
ALTER TABLE "vip_levels" ADD COLUMN     "monthly_bonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "weekly_bonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "deposits" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_promo_tiers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "min_volume" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "level_promo_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_promo_bonuses" (
    "id" SERIAL NOT NULL,
    "tier_id" INTEGER NOT NULL,
    "day_index" INTEGER NOT NULL,
    "bonus_value" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "level_promo_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_promo_progresses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "current_day" INTEGER NOT NULL DEFAULT 0,
    "last_checkin_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_promo_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deposits_user_id_created_at_idx" ON "deposits"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "level_promo_bonuses_tier_id_day_index_idx" ON "level_promo_bonuses"("tier_id", "day_index");

-- CreateIndex
CREATE INDEX "level_promo_progresses_user_id_idx" ON "level_promo_progresses"("user_id");

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_promo_bonuses" ADD CONSTRAINT "level_promo_bonuses_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "level_promo_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_promo_progresses" ADD CONSTRAINT "level_promo_progresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
