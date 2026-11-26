import { beforeEach, describe, expect, it, vi } from "vitest";
import { listOnlineDepartments } from "./online-departments";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.mock("next/cache", () => ({ cacheLife: () => undefined }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("listOnlineDepartments", () => {
  it("compte les cahiers publiés par département, nommé par le référentiel", async () => {
    fake.reply([
      ["04", "Alpes-de-Haute-Provence", "1"],
      ["971", "Guadeloupe", "3"],
    ]);

    await expect(listOnlineDepartments()).resolves.toEqual([
      { code: "04", name: "Alpes-de-Haute-Provence", notebookCount: 1 },
      { code: "971", name: "Guadeloupe", notebookCount: 3 },
    ]);
    expect(fake.queries).toHaveLength(1);
    const [{ sql, params }] = fake.queries;
    expect(sql).toContain('inner join "departments"');
    expect(sql).toContain('group by "departments"."code"');
    expect(params).toEqual(["published"]);
  });

  it("ne renvoie rien sans cahier publié", async () => {
    fake.reply([]);

    await expect(listOnlineDepartments()).resolves.toEqual([]);
  });
});
