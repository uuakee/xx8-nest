-- CreateTable
CREATE TABLE "vip_bonus_redemptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bonus_type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vip_bonus_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vip_bonus_redemptions_user_id_bonus_type_created_at_idx" ON "vip_bonus_redemptions"("user_id", "bonus_type", "created_at");

-- AddForeignKey
ALTER TABLE "vip_bonus_redemptions" ADD CONSTRAINT "vip_bonus_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
