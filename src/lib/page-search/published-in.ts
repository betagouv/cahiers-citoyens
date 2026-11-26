import { type SQL, and, eq, inArray, sql } from "drizzle-orm";
import { notebooks } from "@/db/schema";
import type { PlaceCodes } from "./place-codes";

// Condition sur `notebooks` : publié et, si un lieu est donné, dans ce lieu.
// Les comptes, les suggestions de mots et la liste des résultats partagent
// cette définition, pour afficher les mêmes nombres.
export function publishedIn(place: PlaceCodes | undefined): SQL | undefined {
  const published = eq(notebooks.status, "published");
  if (place === undefined) return published;
  switch (place.kind) {
    case "departments":
      return and(published, inArray(notebooks.departmentCode, place.codes));
    case "municipality":
      // Un cahier porte le code INSEE de 2019 : celui de la commune actuelle,
      // ou celui d'une commune fusionnée depuis dans celle-ci.
      return and(
        published,
        sql`${notebooks.inseeCode} = any(array(select ${place.code}::text union all select old_code from municipality_code_history where current_code = ${place.code}))`,
      );
  }
}
