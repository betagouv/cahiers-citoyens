-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "notebooks" (
    "id" TEXT NOT NULL,
    "insee_code" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "opened_on" DATE NOT NULL,
    "scan_key" TEXT NOT NULL,
    "transcription_key" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "imported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notebooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" BIGSERIAL NOT NULL,
    "notebook_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "search" tsvector GENERATED ALWAYS AS (to_tsvector('french', "content")) STORED,
    "embedding" vector(1024),

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notebooks_department_idx" ON "notebooks"("department");

-- CreateIndex
CREATE INDEX "notebooks_insee_code_idx" ON "notebooks"("insee_code");

-- CreateIndex
CREATE INDEX "chunks_search_idx" ON "chunks" USING GIN ("search");

-- CreateIndex
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex
CREATE UNIQUE INDEX "chunks_notebook_id_position_key" ON "chunks"("notebook_id", "position");

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "notebooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
