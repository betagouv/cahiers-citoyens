import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "../../db/client";
import { ACCENTED, foldAccents } from "./fold-accents";

// Compare `fold_accents`, tel que la migration le crée, à `foldAccents`. La
// fonction est recréée dans le schéma temporaire d'une transaction, donc d'une
// seule connexion : aucune table requise. Lancé seulement si
// TEST_DATABASE_URL est défini.
const url = process.env.TEST_DATABASE_URL;

async function createFunctionStatement(): Promise<string> {
  const migration = await readFile(
    new URL("../../../drizzle/0004_search-counts.sql", import.meta.url),
    "utf8",
  );
  const [statement] = migration
    .split("--> statement-breakpoint")
    .filter((part) => part.includes("CREATE FUNCTION fold_accents"));
  return statement.replace(
    "CREATE FUNCTION fold_accents",
    "CREATE FUNCTION pg_temp.fold_accents",
  );
}

describe.skipIf(url === undefined)("fold_accents (Postgres)", () => {
  const db = createDatabase(url ?? "");
  afterAll(async () => {
    await db.$client.end();
  });

  const words = [
    ACCENTED,
    ACCENTED.toUpperCase(),
    "Œuvre",
    "Lætitia",
    "Retraités",
    "mois-ci",
  ];

  it("replie chaque mot comme foldAccents", async () => {
    const statement = await createFunctionStatement();
    const folded = await db.transaction(async (transaction) => {
      await transaction.execute(sql.raw(statement));
      const rows = await transaction.execute<{ folded: string }>(
        sql`select pg_temp.fold_accents(word) as folded from unnest(${`{${words.map((word) => `"${word}"`).join(",")}}`}::text[]) with ordinality as w(word, position) order by position`,
      );
      return rows.map((row) => row.folded);
    });
    expect(folded).toEqual(words.map(foldAccents));
  });
});
