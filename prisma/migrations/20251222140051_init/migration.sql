-- CreateTable
CREATE TABLE "administrators" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "token_recover" TEXT,
    "otp_code" TEXT,
    "avatar" TEXT NOT NULL DEFAULT 'https://imgcdn.stablediffusionweb.com/2024/5/8/852aa9d2-d1f0-4353-b8f0-cd4f45e8c862.jpg',

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "pid" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "affiliate_balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "vip_balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "vip" INTEGER NOT NULL DEFAULT 0,
    "affiliate_code" TEXT,
    "password_withdrawal" TEXT,
    "avatar" TEXT,
    "blogger" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "banned_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chests" (
    "id" SERIAL NOT NULL,
    "need_referral" INTEGER NOT NULL DEFAULT 0,
    "need_deposit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "need_bet" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "bonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chest_withdrawls" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "chest_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chest_withdrawls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reedem_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "max_collect" INTEGER NOT NULL DEFAULT 0,
    "collected_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reedem_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_levels" (
    "id" SERIAL NOT NULL,
    "id_vip" INTEGER NOT NULL DEFAULT 0,
    "goal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "bonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "vip_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_histories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vip_level_id" INTEGER NOT NULL,
    "goal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "bonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vip_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_affiliate_bonuses" (
    "id" SERIAL NOT NULL,
    "cpa_level_1" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cpa_level_2" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cpa_level_3" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "possibility_bonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "revshare_fake" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "revshare_level_1" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "revshare_level_2" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "revshare_level_3" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "min_deposit_for_cpa" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "min_withdrawal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "fake_revshare" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "default_affiliate_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_histories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "affiliate_user_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cpa_level" INTEGER NOT NULL DEFAULT 0,
    "revshare_level" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prada_payments" (
    "id" SERIAL NOT NULL,
    "base_url" TEXT NOT NULL DEFAULT 'https://api.pradapay.com',
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prada_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pp_clone_providers" (
    "id" SERIAL NOT NULL,
    "base_url" TEXT NOT NULL DEFAULT 'https://api.pragamatic.fun',
    "agent_code" TEXT NOT NULL,
    "agent_secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pp_clone_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pg_clone_providers" (
    "id" SERIAL NOT NULL,
    "base_url" TEXT NOT NULL DEFAULT 'https://api.apioficialpokergames.site/api/v1/',
    "agent_code" TEXT NOT NULL,
    "agent_secret" TEXT NOT NULL,
    "agent_token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pg_clone_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrators_email_key" ON "administrators"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_pid_key" ON "users"("pid");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_document_key" ON "users"("document");

-- CreateIndex
CREATE INDEX "users_status_banned_idx" ON "users"("status", "banned");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "users"("last_login_at");

-- CreateIndex
CREATE INDEX "users_affiliate_code_idx" ON "users"("affiliate_code");

-- CreateIndex
CREATE INDEX "chest_withdrawls_user_id_created_at_idx" ON "chest_withdrawls"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reedem_codes_code_key" ON "reedem_codes"("code");

-- CreateIndex
CREATE INDEX "vip_levels_id_vip_idx" ON "vip_levels"("id_vip");

-- CreateIndex
CREATE INDEX "vip_histories_user_id_created_at_idx" ON "vip_histories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "vip_histories_vip_level_id_idx" ON "vip_histories"("vip_level_id");

-- CreateIndex
CREATE INDEX "affiliate_histories_user_id_created_at_idx" ON "affiliate_histories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "affiliate_histories_affiliate_user_id_idx" ON "affiliate_histories"("affiliate_user_id");

-- AddForeignKey
ALTER TABLE "chest_withdrawls" ADD CONSTRAINT "chest_withdrawls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vip_histories" ADD CONSTRAINT "vip_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vip_histories" ADD CONSTRAINT "vip_histories_vip_level_id_fkey" FOREIGN KEY ("vip_level_id") REFERENCES "vip_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_histories" ADD CONSTRAINT "affiliate_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_histories" ADD CONSTRAINT "affiliate_histories_affiliate_user_id_fkey" FOREIGN KEY ("affiliate_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
