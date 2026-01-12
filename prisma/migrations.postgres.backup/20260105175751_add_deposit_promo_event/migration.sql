-- CreateTable
CREATE TABLE "deposit_promo_events" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_promo_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_promo_tiers" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "bonus_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "rollover_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_promo_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_promo_participations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tier_id" INTEGER NOT NULL,
    "deposit_id" INTEGER NOT NULL,
    "promo_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_promo_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deposit_promo_tiers_event_id_idx" ON "deposit_promo_tiers"("event_id");

-- CreateIndex
CREATE INDEX "deposit_promo_participations_user_id_promo_date_idx" ON "deposit_promo_participations"("user_id", "promo_date");

-- CreateIndex
CREATE INDEX "deposit_promo_participations_tier_id_idx" ON "deposit_promo_participations"("tier_id");

-- CreateIndex
CREATE INDEX "deposit_promo_participations_deposit_id_idx" ON "deposit_promo_participations"("deposit_id");

-- AddForeignKey
ALTER TABLE "deposit_promo_tiers" ADD CONSTRAINT "deposit_promo_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "deposit_promo_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_promo_participations" ADD CONSTRAINT "deposit_promo_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_promo_participations" ADD CONSTRAINT "deposit_promo_participations_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "deposit_promo_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_promo_participations" ADD CONSTRAINT "deposit_promo_participations_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
