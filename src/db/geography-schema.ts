import { sql } from "drizzle-orm";
import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

// Référentiel géographique de toute la France, chargé par
// `scripts/load-geography.ts` depuis geo.api.gouv.fr et le COG de l'Insee.

export const departments = pgTable("departments", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  regionCode: text("region_code").notNull(),
});

// Communes actuelles. `department_code` n'a pas de clé étrangère : les
// collectivités d'outre-mer (975, 984, 986…) ont des communes mais ne sont pas
// des départements.
export const municipalities = pgTable(
  "municipalities",
  {
    inseeCode: text("insee_code").primaryKey(),
    name: text("name").notNull(),
    departmentCode: text("department_code").notNull(),
    // Absente pour quelques territoires sans population recensée.
    population: integer("population"),
    postalCodes: text("postal_codes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Nom en minuscules, sans accents ni ponctuation (`toSearchName`), pour
    // l'autocomplétion par préfixe : `search_name like 'saint et%'`.
    searchName: text("search_name").notNull(),
  },
  (table) => [
    index("municipalities_search_name_idx").on(
      table.searchName.op("text_pattern_ops"),
    ),
    index("municipalities_department_code_idx").on(table.departmentCode),
    // Recherche par code postal : `postal_codes && '{71120,71121…}'`.
    index("municipalities_postal_codes_idx").using("gin", table.postalCodes),
  ],
);

// Les cahiers portent le code INSEE de 2019. Une commune fusionnée ou recodée
// depuis pointe ici vers son code actuel. Un code absent de cette table est
// resté le même. Le nom et le département sont ceux du 1er janvier 2019 :
// « Béon (01) » se cherche encore par son nom, après sa fusion dans
// Culoz-Béon.
export const municipalityCodeHistory = pgTable(
  "municipality_code_history",
  {
    oldCode: text("old_code").primaryKey(),
    currentCode: text("current_code")
      .notNull()
      .references(() => municipalities.inseeCode, { onDelete: "cascade" }),
    name: text("name").notNull(),
    departmentCode: text("department_code").notNull(),
    // Comme `municipalities.search_name`.
    searchName: text("search_name").notNull(),
  },
  (table) => [
    index("municipality_code_history_search_name_idx").on(
      table.searchName.op("text_pattern_ops"),
    ),
  ],
);
