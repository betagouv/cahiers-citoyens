import { beforeEach, describe, expect, it, vi } from "vitest";
import { listKeywordLines } from "./keyword-lines";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

const BOX = [
  [
    [10.4, 20.6],
    [300, 20],
    [300, 60],
    [10, 60],
    [10.4, 20.6],
  ],
];

beforeEach(() => {
  fake.reset();
});

describe("listKeywordLines", () => {
  it("garde les lignes qui contiennent un mot du mot-clé, contour arrondi", async () => {
    fake.reply([
      [1, "Un impôt juste", BOX],
      [1, "Des impôts", BOX],
      [2, "RETRAITE", [[[1, 2]], [[5, 5]]]],
    ]);

    await expect(
      listKeywordLines("CC_1", 2, "impôt retraite"),
    ).resolves.toEqual([
      { page: 1, points: "10,21 300,20 300,60 10,60 10,21" },
      { page: 2, points: "1,2" },
    ]);
    const [query] = fake.queries;
    expect(query.sql).toContain(
      'where ("lines"."notebook_id" = $1 and "notebooks"."status" = $2 and "notebooks"."online_version" = $3)',
    );
    expect(query.sql).toContain(
      'order by "lines"."page" asc, "lines"."position" asc',
    );
    expect(query.params).toEqual(["CC_1", "published", 2]);
  });

  it("ne lit rien pour un mot-clé sans mot", async () => {
    await expect(listKeywordLines("CC_1", 2, "…")).resolves.toEqual([]);
    expect(fake.queries).toEqual([]);
  });
});
