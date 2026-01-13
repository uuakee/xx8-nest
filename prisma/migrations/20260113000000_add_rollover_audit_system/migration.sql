-- CreateTable
CREATE TABLE "rollover_requirements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" INTEGER,
    "amount_required" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "amount_completed" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "multiplier" DECIMAL(10,2) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rollover_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rollover_requirements_user_id_status_created_at_idx" ON "rollover_requirements"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "rollover_requirements_source_type_source_id_idx" ON "rollover_requirements"("source_type", "source_id");

-- AddForeignKey
ALTER TABLE "rollover_requirements" ADD CONSTRAINT "rollover_requirements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add new columns to settings
ALTER TABLE "settings" ADD COLUMN "default_rollover_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "settings" ADD COLUMN "default_rollover_multiplier" DECIMAL(10,2) NOT NULL DEFAULT 2.00;
ALTER TABLE "settings" ADD COLUMN "new_user_roullete" BOOLEAN NOT NULL DEFAULT true;
