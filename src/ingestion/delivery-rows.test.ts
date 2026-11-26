import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { markApplied, readDeliveryStatus } from "./delivery-rows";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("readDeliveryStatus", () => {
  it("lit le statut du dépôt", async () => {
    fake.reply([["applying"]]);

    await expect(readDeliveryStatus(db, 3, false)).resolves.toBe("applying");
    expect(fake.queries[0].sql).not.toContain("for update");
    expect(fake.queries[0].params).toEqual([3]);
  });

  it("verrouille la ligne du dépôt dans une transaction", async () => {
    fake.reply([["applying"]]);

    await readDeliveryStatus(db, 3, true);

    expect(fake.queries[0].sql).toMatch(/for update$/);
  });

  it("refuse un dépôt inconnu", async () => {
    await expect(readDeliveryStatus(db, 9, false)).rejects.toThrow(
      "Dépôt inconnu : 9",
    );
  });
});

describe("markApplied", () => {
  it("passe le dépôt à applied avec ses compteurs", async () => {
    await db.transaction((tx) =>
      markApplied(tx, 3, { published: 2, replaced: 1, unchanged: 4 }),
    );

    expect(fake.queries[1]).toEqual({
      sql: 'update "deliveries" set "status" = $1, "applied_at" = now(), "published_count" = $2, "replaced_count" = $3, "unchanged_count" = $4 where "deliveries"."id" = $5',
      params: ["applied", 2, 1, 4, 3],
    });
  });
});
