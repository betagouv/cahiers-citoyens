import type { Database } from "../../src/db/client";
import {
  departments,
  municipalities,
  municipalityCodeHistory,
} from "../../src/db/schema";
import type { CodeChange } from "./code-history";
import type { Department, Municipality } from "./geo-api";

export interface Geography {
  departments: Department[];
  municipalities: Municipality[];
  codeChanges: CodeChange[];
}

// 1 000 communes de 6 colonnes : 6 000 paramètres, loin de la limite de
// Postgres (65 535 par requête).
export const BATCH_SIZE = 1000;

export function batches<T>(rows: T[], size: number = BATCH_SIZE): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < rows.length; start += size) {
    result.push(rows.slice(start, start + size));
  }
  return result;
}

// Remplace tout le référentiel dans une transaction : une commune fusionnée
// depuis le dernier chargement disparaît, et un nouveau lancement aboutit au
// même état. Les lecteurs voient l'ancien référentiel jusqu'au commit.
export async function replaceGeography(
  db: Database,
  geography: Geography,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(municipalityCodeHistory);
    await tx.delete(municipalities);
    await tx.delete(departments);
    for (const batch of batches(geography.departments)) {
      await tx.insert(departments).values(batch);
    }
    for (const batch of batches(geography.municipalities)) {
      await tx.insert(municipalities).values(batch);
    }
    for (const batch of batches(geography.codeChanges)) {
      await tx.insert(municipalityCodeHistory).values(batch);
    }
  });
}
