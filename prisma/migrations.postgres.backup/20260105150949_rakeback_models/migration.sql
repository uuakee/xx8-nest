-- CreateTable
CREATE TABLE "rakeback_settings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "min_volume" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "percentage" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rakeback_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rakeback_histories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "setting_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "redeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rakeback_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rakeback_histories_user_id_created_at_idx" ON "rakeback_histories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "rakeback_histories_setting_id_idx" ON "rakeback_histories"("setting_id");

-- AddForeignKey
ALTER TABLE "rakeback_histories" ADD CONSTRAINT "rakeback_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rakeback_histories" ADD CONSTRAINT "rakeback_histories_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "rakeback_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
