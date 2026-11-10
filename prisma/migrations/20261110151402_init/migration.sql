-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "cahiers" (
    "id" TEXT NOT NULL,
    "code_insee" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "date_ouverture" DATE NOT NULL,
    "cle_scan" TEXT NOT NULL,
    "cle_transcription" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "importe_le" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cahiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" BIGSERIAL NOT NULL,
    "cahier_id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "recherche" tsvector GENERATED ALWAYS AS (to_tsvector('french', "contenu")) STORED,
    "embedding" vector(1024),

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cahiers_departement_idx" ON "cahiers"("departement");

-- CreateIndex
CREATE INDEX "cahiers_code_insee_idx" ON "cahiers"("code_insee");

-- CreateIndex
CREATE INDEX "chunks_recherche_idx" ON "chunks" USING GIN ("recherche");

-- CreateIndex
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex
CREATE UNIQUE INDEX "chunks_cahier_id_ordre_key" ON "chunks"("cahier_id", "ordre");

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_cahier_id_fkey" FOREIGN KEY ("cahier_id") REFERENCES "cahiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
