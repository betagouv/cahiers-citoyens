import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "../../db/client";
import { anyWordQuery } from "./retrieval";

// Interroge un vrai Postgres (aucune table requise) : lancé seulement si
// TEST_DATABASE_URL est défini, par exemple la base locale de développement.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(url === undefined)("anyWordQuery (Postgres)", () => {
  const db = createDatabase(url ?? "");
  afterAll(async () => {
    await db.$client.end();
  });

  async function matches(document: string, query: string) {
    const [row] = await db.execute<{ matches: boolean }>(
      sql`select to_tsvector('french', ${document}) @@ ${anyWordQuery(query)} as matches`,
    );
    return row.matches;
  }

  const question = "Que disent les habitants du prix du carburant ?";
  const passage = "Le carburant a encore augmenté ce mois-ci.";

  it("trouve un passage qui ne contient qu'un mot de la question", async () => {
    await expect(matches(passage, question)).resolves.toBe(true);
  });

  it("là où la requête en ET ne trouvait rien", async () => {
    const [row] = await db.execute<{ matches: boolean }>(
      sql`select to_tsvector('french', ${passage}) @@ websearch_to_tsquery('french', ${question}) as matches`,
    );
    expect(row.matches).toBe(false);
  });

  it("ramène les mots à leur racine", async () => {
    await expect(matches("Les carburants flambent", "carburant")).resolves.toBe(
      true,
    );
  });

  it("ne trouve rien sans mot commun ni pour une question de mots vides", async () => {
    await expect(matches(passage, "médecin village")).resolves.toBe(false);
    await expect(matches(passage, "le la de")).resolves.toBe(false);
  });

  it("ne se laisse pas détourner par les opérateurs de la saisie", async () => {
    await expect(matches(passage, "carburant & ! ( | ')")).resolves.toBe(true);
  });
});
