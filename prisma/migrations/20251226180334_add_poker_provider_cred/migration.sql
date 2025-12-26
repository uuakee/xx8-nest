-- CreateTable
CREATE TABLE "poker_providers" (
    "id" SERIAL NOT NULL,
    "base_url" TEXT NOT NULL DEFAULT 'https://pokersgamessistemas.com/api/v1/',
    "agent_code" TEXT NOT NULL,
    "agent_secret" TEXT NOT NULL,
    "agent_token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poker_providers_pkey" PRIMARY KEY ("id")
);
