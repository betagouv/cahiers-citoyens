import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchByVector, searchFullText } from "./retrieval";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("searchFullText", () => {
  it("cherche n'importe quel mot de la question, classé par ts_rank", async () => {
    fake.reply([["7", "CC_2", "4", "Le carburant augmente."]]);

    await expect(searchFullText("prix du carburant", 30)).resolves.toEqual([
      { id: 7, notebookId: "CC_2", page: 4, content: "Le carburant augmente." },
    ]);
    const [query] = fake.queries;
    expect(query.sql).toContain(
      `inner join "notebooks" on ("notebooks"."id" = "chunks"."notebook_id" and "notebooks"."status" = $1)`,
    );
    expect(query.sql).toContain(
      `"chunks"."search" @@ replace(plainto_tsquery('french', $2)::text, '&', '|')::tsquery`,
    );
    expect(query.sql).toContain(
      `order by ts_rank("chunks"."search", replace(plainto_tsquery('french', $3)::text, '&', '|')::tsquery) desc, "chunks"."id" asc limit $4`,
    );
    expect(query.params).toEqual([
      "published",
      "prix du carburant",
      "prix du carburant",
      30,
    ]);
  });
});

describe("searchByVector", () => {
  it("classe les passages vectorisés par distance cosinus croissante", async () => {
    fake.reply([["3", "notebook-0001", null, "Plus de médecin."]]);

    await expect(searchByVector([0.25, 0.5], 5)).resolves.toEqual([
      {
        id: 3,
        notebookId: "notebook-0001",
        page: null,
        content: "Plus de médecin.",
      },
    ]);
    const [query] = fake.queries;
    expect(query.sql).toContain(`where "chunks"."embedding" is not null`);
    expect(query.sql).toContain(
      `order by "chunks"."embedding" <=> $2 asc, "chunks"."id" asc limit $3`,
    );
    expect(query.sql).toContain(`inner join "notebooks"`);
    expect(query.params).toEqual(["published", "[0.25,0.5]", 5]);
  });
});
