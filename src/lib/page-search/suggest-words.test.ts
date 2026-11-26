import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_WORD_SUGGESTIONS, suggestWords } from "./suggest-words";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("suggestWords", () => {
  it("ne cherche rien avant deux lettres", async () => {
    await expect(suggestWords(" r ", undefined)).resolves.toEqual([]);
    expect(fake.queries).toEqual([]);
  });

  it("lit les comptes précalculés de la France entière", async () => {
    fake.reply([
      ["retraite", 7],
      ["retraités", 2],
    ]);

    await expect(suggestWords("Rétr", undefined)).resolves.toEqual([
      { word: "retraite", pageCount: 7 },
      { word: "retraités", pageCount: 2 },
    ]);
    const [{ sql, params }] = fake.queries;
    expect(sql).toContain('from "word_page_counts"');
    expect(sql).toContain(
      'where ("word_page_counts"."scope" in ($1) and "word_page_counts"."search_word" like $2)',
    );
    expect(sql).toContain(
      'order by sum("word_page_counts"."page_count")::int desc',
    );
    expect(params).toEqual(["FR", "retr%", MAX_WORD_SUGGESTIONS]);
  });

  it("additionne les départements d'un lieu", async () => {
    await suggestWords("retr", { kind: "departments", codes: ["971", "972"] });

    expect(fake.queries[0].params).toEqual([
      "971",
      "972",
      "retr%",
      MAX_WORD_SUGGESTIONS,
    ]);
  });

  it("lit directement les pages d'une commune", async () => {
    fake.reply([["retraite", 1]]);

    await expect(
      suggestWords("retr", { kind: "municipality", code: "71106" }),
    ).resolves.toEqual([{ word: "retraite", pageCount: 1 }]);
    const [{ sql, params }] = fake.queries;
    expect(sql).toContain('cross join lateral unnest("pages"."words") as w');
    expect(sql).toContain("fold_accents(w.lexeme) like $4");
    expect(params).toEqual([
      "published",
      "71106",
      "71106",
      "retr%",
      MAX_WORD_SUGGESTIONS,
    ]);
  });
});
