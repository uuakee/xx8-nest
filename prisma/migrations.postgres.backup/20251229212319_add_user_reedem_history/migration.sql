-- CreateTable
CREATE TABLE "reedem_code_histories" (
    "id" SERIAL NOT NULL,
    "reedem_code_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reedem_code_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reedem_code_histories_reedem_code_id_user_id_idx" ON "reedem_code_histories"("reedem_code_id", "user_id");

-- AddForeignKey
ALTER TABLE "reedem_code_histories" ADD CONSTRAINT "reedem_code_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reedem_code_histories" ADD CONSTRAINT "reedem_code_histories_reedem_code_id_fkey" FOREIGN KEY ("reedem_code_id") REFERENCES "reedem_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
