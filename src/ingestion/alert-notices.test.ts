import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { claimNotice, clearNotice } from "./alert-notices";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");
const NOW = new Date("2026-11-25T10:00:00Z");

beforeEach(() => {
  fake.reset();
});

describe("claimNotice", () => {
  it("note l'envoi si l'alerte n'est pas partie depuis un jour", async () => {
    fake.reply([["chunks.unembedded"]]);

    await expect(claimNotice(db, "chunks.unembedded", NOW)).resolves.toBe(true);
    expect(fake.queries[0]).toEqual({
      sql: 'insert into "alert_notices" ("key", "sent_at") values ($1, $2) on conflict ("key") do update set "sent_at" = $3 where "alert_notices"."sent_at" <= $4 returning "key"',
      params: [
        "chunks.unembedded",
        NOW.toISOString(),
        NOW.toISOString(),
        "2026-11-24T10:00:00.000Z",
      ],
    });
  });

  it("renvoie false si l'alerte est partie depuis moins d'un jour", async () => {
    fake.reply([]);

    await expect(claimNotice(db, "chunks.unembedded", NOW)).resolves.toBe(
      false,
    );
  });
});

describe("clearNotice", () => {
  it("oublie l'alerte", async () => {
    await clearNotice(db, "chunks.unembedded");

    expect(fake.queries[0]).toEqual({
      sql: 'delete from "alert_notices" where "alert_notices"."key" = $1',
      params: ["chunks.unembedded"],
    });
  });
});
