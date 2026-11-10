import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const notebooks = pgTable("notebooks", {
  id: text("id").primaryKey(),
  openedOn: date("opened_on", { mode: "string" }).notNull(),
  scanKey: text("scan_key").notNull(),
  transcriptionKey: text("transcription_key").notNull(),
  transcription: text("transcription").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    notebookId: text("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    content: text("content").notNull(),
    search: tsvector("search").generatedAlwaysAs(
      sql`to_tsvector('french', "content")`,
    ),
    // 1024 : dimension supposée de bge-m3, le modèle d'embeddings visé chez Albert. À confirmer.
    embedding: vector("embedding", { dimensions: 1024 }),
  },
  (table) => [
    unique("chunks_notebook_id_position_key").on(
      table.notebookId,
      table.position,
    ),
    index("chunks_search_idx").using("gin", table.search),
    index("chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
