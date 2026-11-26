import { beforeEach, describe, expect, it, vi } from "vitest";
import { RESULTS_PAGE_SIZE, listPages } from "./list-pages";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("listPages", () => {
  it("liste les pages d'un mot-clé avec un extrait surligné", async () => {
    fake.reply([["nb-1", 12, "Charolles", "71", "La ⟦retraite⟧ à 60 ans"]]);

    await expect(
      listPages({ kind: "municipality", code: "71106" }, "retraite", 2),
    ).resolves.toEqual([
      {
        notebookId: "nb-1",
        number: 12,
        municipalityName: "Charolles",
        departmentCode: "71",
        excerpt: "La ⟦retraite⟧ à 60 ans",
      },
    ]);
    const [{ sql, params }] = fake.queries;
    expect(sql).toContain(
      "ts_headline('simple', \"pages\".\"text\", plainto_tsquery('simple', $1), $2)",
    );
    expect(sql).toContain(
      'order by "pages"."notebook_id" asc, "pages"."number" asc',
    );
    expect(params[0]).toBe("retraite");
    expect(params[1]).toContain("StartSel=⟦, StopSel=⟧");
    expect(params.slice(-2)).toEqual([RESULTS_PAGE_SIZE, RESULTS_PAGE_SIZE]);
  });

  it("liste toutes les pages d'un lieu, avec leur début", async () => {
    await listPages({ kind: "departments", codes: ["25"] }, "", 1);

    const [{ sql, params }] = fake.queries;
    expect(sql).toContain('left("pages"."text", $1)');
    expect(sql).not.toContain("plainto_tsquery");
    expect(params).toEqual([400, "published", "25", RESULTS_PAGE_SIZE]);
  });
});
