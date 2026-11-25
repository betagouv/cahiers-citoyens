import { beforeEach, describe, expect, it, vi } from "vitest";
import { countPages } from "./count-pages";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

function onlyQuery() {
  expect(fake.queries).toHaveLength(1);
  const [{ sql, params }] = fake.queries;
  return { sql: sql.replace(/\s+/g, " "), params };
}

describe("countPages", () => {
  it("vaut 0 sans lieu ni mot-clé, sans requête", async () => {
    await expect(countPages(undefined, "")).resolves.toBe(0);
    expect(fake.queries).toEqual([]);
  });

  it("lit le compte précalculé d'un lieu sans mot-clé", async () => {
    fake.reply([[286]]);

    await expect(
      countPages({ kind: "municipality", code: "71106" }, ""),
    ).resolves.toBe(286);
    const { sql, params } = onlyQuery();
    expect(sql).toContain('from "place_page_counts"');
    expect(params).toEqual(["71106"]);
  });

  it("additionne les départements d'un lieu", async () => {
    fake.reply([[50]]);

    await countPages({ kind: "departments", codes: ["971", "972"] }, "");

    expect(onlyQuery().params).toEqual(["971", "972"]);
  });

  it("compte un mot en France par le compte précalculé, plusieurs en direct", async () => {
    fake.reply([{ page_count: 1896 }]);

    await expect(countPages(undefined, "retraite")).resolves.toBe(1896);
    const { sql, params } = onlyQuery();
    expect(sql).toContain(
      "case when cardinality(lexemes.words) = 1 then ((select coalesce(sum(",
    );
    expect(sql).toContain('"word_page_counts"."word" = lexemes.words[1]');
    expect(sql).toContain('"pages"."words" @@ plainto_tsquery(\'simple\', $');
    expect(sql).toContain(
      "from (select array(select lexeme from unnest(to_tsvector('simple', $",
    );
    expect(params).toContain("FR");
    expect(params.filter((param) => param === "retraite")).toHaveLength(2);
  });

  it("compte en direct dans une commune", async () => {
    fake.reply([{ page_count: 7 }]);

    await expect(
      countPages({ kind: "municipality", code: "71106" }, "retraite"),
    ).resolves.toBe(7);
    const { sql, params } = onlyQuery();
    expect(sql).not.toContain("word_page_counts");
    expect(sql).not.toContain("case when");
    expect(params).toEqual([
      "published",
      "71106",
      "71106",
      "retraite",
      "retraite",
    ]);
  });
});
