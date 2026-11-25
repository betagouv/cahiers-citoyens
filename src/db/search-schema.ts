import { integer, pgMaterializedView, text } from "drizzle-orm/pg-core";

// Comptes précalculés pour les suggestions de la recherche par lieu et
// mot-clé. Les vues sont créées par la migration `0004_search-counts.sql`
// (`.existing()` : drizzle-kit ne les gère pas) et recalculées par
// `select refresh_search_counts()` après chaque changement des pages publiées.

// Nombre de pages publiées qui contiennent chaque mot, tel qu'écrit, par
// département (`scope` = code du département) et pour toute la France
// (`scope` = 'FR'). `search_word` est le mot replié par `fold_accents`.
export const wordPageCounts = pgMaterializedView("word_page_counts", {
  scope: text("scope").notNull(),
  word: text("word").notNull(),
  searchWord: text("search_word").notNull(),
  pageCount: integer("page_count").notNull(),
}).existing();

// Nombre de pages publiées par département et par commune actuelle (code INSEE
// de 2019 ramené au code actuel par `municipality_code_history`).
export const placePageCounts = pgMaterializedView("place_page_counts", {
  place: text("place").notNull(),
  pageCount: integer("page_count").notNull(),
}).existing();
