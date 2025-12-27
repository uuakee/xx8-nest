-- CreateTable
CREATE TABLE "game_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "player_id" INTEGER NOT NULL,
    "session_id" TEXT,
    "provider_transaction_id" TEXT,
    "internal_transaction_id" TEXT,
    "game_uuid" TEXT,
    "round_id" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'BRL',
    "raw_request" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_transactions_user_id_created_at_idx" ON "game_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "game_transactions_player_id_created_at_idx" ON "game_transactions"("player_id", "created_at");

-- CreateIndex
CREATE INDEX "game_transactions_provider_transaction_id_idx" ON "game_transactions"("provider_transaction_id");

-- AddForeignKey
ALTER TABLE "game_transactions" ADD CONSTRAINT "game_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
