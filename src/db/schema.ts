import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";
import { DELIVERY_STATUSES } from "../ingestion/delivery-status";
import type { IngestError } from "../ingestion/errors";
import {
  IMAGE_CONTENT_TYPES,
  LINE_KIND_VALUES,
  type Polygon,
  TRANSCRIPTION_METHOD_VALUES,
} from "../ingestion/notebook";
import {
  NOTEBOOK_STATUSES,
  WITHDRAWAL_REASONS,
} from "../ingestion/notebook-status";
import { EMBEDDING_DIMENSIONS } from "../lib/albert";
import { sqlInList } from "./sql-in-list";

export * from "./geography-schema";
export * from "./search-schema";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const notebooks = pgTable(
  "notebooks",
  {
    id: text("id").primaryKey(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status", { enum: NOTEBOOK_STATUSES })
      .notNull()
      .default("published"),
    // Vide pour un cahier chargé avant les dépôts, sans version ni pages.
    onlineVersion: integer("online_version"),
    withdrawalReason: text("withdrawal_reason", { enum: WITHDRAWAL_REASONS }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    // Métadonnées du JSON de Condorcet. Le code INSEE est celui de 2019, tel
    // que livré : `municipality_code_history` donne le code actuel.
    departmentName: text("department_name"),
    departmentCode: text("department_code"),
    municipalityName: text("municipality_name"),
    inseeCode: text("insee_code"),
    postalCode: text("postal_code"),
    typedTranscription: text("typed_transcription", {
      enum: TRANSCRIPTION_METHOD_VALUES,
    }),
    handwrittenTranscription: text("handwritten_transcription", {
      enum: TRANSCRIPTION_METHOD_VALUES,
    }),
  },
  (table) => [
    foreignKey({
      name: "notebooks_online_version_fk",
      columns: [table.id, table.onlineVersion],
      foreignColumns: [notebookVersions.notebookId, notebookVersions.version],
    }),
    check(
      "notebooks_status_check",
      sql`${table.status} in ${sqlInList(NOTEBOOK_STATUSES)}`,
    ),
    check(
      "notebooks_withdrawal_reason_check",
      sql`${table.withdrawalReason} in ${sqlInList(WITHDRAWAL_REASONS)}`,
    ),
    // Un cahier retiré a un motif et une date ; un cahier publié n'en a pas.
    check(
      "notebooks_withdrawal_check",
      sql`(${table.status} = 'withdrawn') = (${table.withdrawalReason} is not null) and (${table.withdrawalReason} is null) = (${table.withdrawnAt} is null)`,
    ),
    check(
      "notebooks_typed_transcription_check",
      sql`${table.typedTranscription} in ${sqlInList(TRANSCRIPTION_METHOD_VALUES)}`,
    ),
    check(
      "notebooks_handwritten_transcription_check",
      sql`${table.handwrittenTranscription} in ${sqlInList(TRANSCRIPTION_METHOD_VALUES)}`,
    ),
    index("notebooks_department_code_idx").on(table.departmentCode),
    index("notebooks_insee_code_idx").on(table.inseeCode),
  ],
);

// Un ZIP reçu de Condorcet. Chaque statut atteint garde sa date ; après une
// relance (`failed` → `verifying`), `verifying_at` porte la dernière.
export const deliveries = pgTable(
  "deliveries",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    name: text("name").notNull().unique("deliveries_name_key"),
    status: text("status", { enum: DELIVERY_STATUSES })
      .notNull()
      .default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verifyingAt: timestamp("verifying_at", { withTimezone: true }),
    applyingAt: timestamp("applying_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    errors: jsonb("errors").$type<IngestError[]>().notNull().default([]),
    // Traitements commencés par le job, relances comprises : au-delà de
    // `MAX_ATTEMPTS` (src/ingestion/delivery-rows.ts), le dépôt n'est plus relancé.
    attempts: integer("attempts").notNull().default(0),
    // Message de la dernière erreur de notre côté (`failed`), gardé après une relance réussie.
    failure: text("failure"),
    publishedCount: integer("published_count").notNull().default(0),
    replacedCount: integer("replaced_count").notNull().default(0),
    unchangedCount: integer("unchanged_count").notNull().default(0),
    // Écriture de `reports/<nom>.json` après le statut final : vide tant que
    // le rapport reste à écrire, et le job suivant le réessaie.
    reportedAt: timestamp("reported_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "deliveries_status_check",
      sql`${table.status} in ${sqlInList(DELIVERY_STATUSES)}`,
    ),
  ],
);

// Historique en ajout seul : une ligne par version publiée d'un cahier.
export const notebookVersions = pgTable(
  "notebook_versions",
  {
    notebookId: text("notebook_id")
      .notNull()
      .references((): AnyPgColumn => notebooks.id),
    // Attribué par nous : 1, puis +1 à chaque remplacement.
    version: integer("version").notNull(),
    deliveryId: bigint("delivery_id", { mode: "number" })
      .notNull()
      .references(() => deliveries.id),
    fingerprint: text("fingerprint").notNull(),
    // Valeur opaque de Condorcet, gardée telle quelle.
    schemaVersion: text("schema_version").notNull(),
    pageCount: integer("page_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "notebook_versions_pkey",
      columns: [table.notebookId, table.version],
    }),
    check("notebook_versions_version_check", sql`${table.version} > 0`),
    index("notebook_versions_delivery_id_idx").on(table.deliveryId),
  ],
);

// Pages de la version en ligne. Les numéros suivent le protocole : croissants,
// avec des trous possibles. `text` réunit les lignes dans l'ordre, pour la
// lecture et la recherche plein texte par page. `search` ramène les mots à leur
// racine française ; `words` garde chaque mot tel qu'écrit, en minuscules et
// avec ses accents (« retraite », « retraité » et « retraites » restent
// distincts), pour la recherche par mot-clé et ses suggestions.
export const pages = pgTable(
  "pages",
  {
    notebookId: text("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    imageKey: text("image_key").notNull(),
    imageContentType: text("image_content_type", {
      enum: IMAGE_CONTENT_TYPES,
    }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    text: text("text").notNull(),
    search: tsvector("search").generatedAlwaysAs(
      sql`to_tsvector('french', "text")`,
    ),
    words: tsvector("words").generatedAlwaysAs(
      sql`to_tsvector('simple', "text")`,
    ),
  },
  (table) => [
    primaryKey({
      name: "pages_pkey",
      columns: [table.notebookId, table.number],
    }),
    check(
      "pages_image_content_type_check",
      sql`${table.imageContentType} in ${sqlInList(IMAGE_CONTENT_TYPES)}`,
    ),
    index("pages_search_idx").using("gin", table.search),
    index("pages_words_idx").using("gin", table.words),
  ],
);

// Lignes d'une page, dans l'ordre du JSON, avec leur polygone sur l'image.
export const lines = pgTable(
  "lines",
  {
    notebookId: text("notebook_id").notNull(),
    page: integer("page").notNull(),
    position: integer("position").notNull(),
    kind: text("kind", { enum: LINE_KIND_VALUES }).notNull(),
    // `null` quand Condorcet n'a pas renseigné la zone.
    zone: text("zone"),
    text: text("text").notNull(),
    polygon: jsonb("polygon").$type<Polygon>().notNull(),
  },
  (table) => [
    primaryKey({
      name: "lines_pkey",
      columns: [table.notebookId, table.page, table.position],
    }),
    foreignKey({
      name: "lines_page_fk",
      columns: [table.notebookId, table.page],
      foreignColumns: [pages.notebookId, pages.number],
    }).onDelete("cascade"),
    check(
      "lines_kind_check",
      sql`${table.kind} in ${sqlInList(LINE_KIND_VALUES)}`,
    ),
  ],
);

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
    // Page citée par la recherche. Vide pour un cahier chargé avant les dépôts.
    page: integer("page"),
    content: text("content").notNull(),
    // Pour alerter sur les chunks qui attendent leur embedding depuis trop longtemps.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    search: tsvector("search").generatedAlwaysAs(
      sql`to_tsvector('french', "content")`,
    ),
    // Dimension des vecteurs de bge-m3, le modèle d'embeddings servi par Albert.
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (table) => [
    unique("chunks_notebook_id_position_key").on(
      table.notebookId,
      table.position,
    ),
    foreignKey({
      name: "chunks_page_fk",
      columns: [table.notebookId, table.page],
      foreignColumns: [pages.notebookId, pages.number],
    }).onDelete("cascade"),
    index("chunks_search_idx").using("gin", table.search),
    index("chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

// Dernier passage de chaque job, lu par `/api/health`. Une ligne par job.
export const jobRuns = pgTable("job_runs", {
  job: text("job").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  errorCount: integer("error_count").notNull(),
});

// Dernier envoi de chaque alerte répétée (archive bloquée, chunks en attente) :
// le job, qui tourne au moins toutes les heures, ne la renvoie qu'une fois par jour.
export const alertNotices = pgTable("alert_notices", {
  key: text("key").primaryKey(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
});
