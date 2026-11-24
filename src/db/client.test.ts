import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

async function loadClient() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  fake.reset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createDatabase", () => {
  it("ouvre une connexion sur l'URL donnée et y envoie les requêtes", async () => {
    const { createDatabase } = await loadClient();
    fake.reply([[1]]);

    const db = createDatabase("postgres://test/base");
    const rows = await db.execute(sql`select 1 as one`);

    expect(fake.urls).toEqual(["postgres://test/base"]);
    expect(fake.queries).toEqual([{ sql: "select 1 as one", params: [] }]);
    expect(rows).toEqual([[1]]);
  });
});

describe("getDatabase", () => {
  it("exige DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDatabase } = await loadClient();

    expect(() => getDatabase()).toThrow("DATABASE_URL est obligatoire");
    expect(fake.urls).toEqual([]);
  });

  it("ouvre la connexion une seule fois, à la première demande", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://test/app");
    const { getDatabase } = await loadClient();
    expect(fake.urls).toEqual([]);

    const first = getDatabase();
    const second = getDatabase();

    expect(second).toBe(first);
    expect(fake.urls).toEqual(["postgres://test/app"]);
  });
});
