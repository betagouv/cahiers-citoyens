import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import type { ImageStorage } from "./image-storage";
import { withdrawNotebook } from "./withdraw";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");
const KEYS = ["notebooks/a/v2/1.jpg", "notebooks/a/v2/2.png"];

function memoryStorage() {
  const removes: string[] = [];
  const storage: ImageStorage = {
    put: () => Promise.resolve(),
    async remove(key) {
      removes.push(key);
    },
  };
  return { storage, removes };
}

function statements(): string[] {
  return fake.queries.map(({ sql }) => sql.split(" ").slice(0, 3).join(" "));
}

beforeEach(() => {
  fake.reset();
});

describe("withdrawNotebook", () => {
  it("retire le cahier et ses chunks, recalcule les comptes puis supprime ses images", async () => {
    const { storage, removes } = memoryStorage();
    fake.reply(
      [["published"]],
      [],
      [],
      KEYS.map((key) => [key]),
    );

    await expect(
      withdrawNotebook({ db, storage, log: vi.fn() }, "a", "sensitive_content"),
    ).resolves.toBe("withdrawn");

    expect(statements()).toEqual([
      "begin",
      'select "status" from',
      'update "notebooks" set',
      'delete from "chunks"',
      'select "image_key" from',
      "commit",
      "select refresh_search_counts()",
    ]);
    expect(fake.queries[1].sql).toMatch(/for update$/);
    expect(fake.queries[2]).toEqual({
      sql: 'update "notebooks" set "status" = $1, "withdrawal_reason" = $2, "withdrawn_at" = now() where "notebooks"."id" = $3',
      params: ["withdrawn", "sensitive_content", "a"],
    });
    expect(removes).toEqual(KEYS);
  });

  it("garde le premier retrait mais refait la suppression des images", async () => {
    const { storage, removes } = memoryStorage();
    fake.reply(
      [["withdrawn"]],
      KEYS.map((key) => [key]),
    );

    await expect(
      withdrawNotebook({ db, storage, log: vi.fn() }, "a", "other"),
    ).resolves.toBe("already-withdrawn");

    expect(statements()).not.toContain('update "notebooks" set');
    expect(statements()).toContain("select refresh_search_counts()");
    expect(removes).toEqual(KEYS);
  });

  it("refuse un cahier inconnu", async () => {
    const { storage } = memoryStorage();

    await expect(
      withdrawNotebook({ db, storage, log: vi.fn() }, "inconnu", "other"),
    ).rejects.toThrow("Cahier inconnu : inconnu");
    expect(statements()).not.toContain("commit");
  });
});
