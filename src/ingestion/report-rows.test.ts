import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { listUnreportedDeliveries, markReported } from "./report-rows";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");
const RECEIVED = "2026-11-24T09:31:12Z";
const DONE = "2026-11-24T09:35:00Z";

beforeEach(() => {
  fake.reset();
});

// Colonnes dans l'ordre du select : id, name, status, attempts, failure,
// receivedAt, appliedAt, rejectedAt, failedAt, published, replaced,
// unchanged, errors.
function row(status: string, dates: (string | null)[]) {
  return [1, "d.zip", status, 1, null, RECEIVED, ...dates, 2, 1, 4, []];
}

describe("listUnreportedDeliveries", () => {
  it("lit les dépôts finis sans rapport, failed seulement après les tentatives", async () => {
    fake.reply([row("applied", [DONE, null, null])]);

    await expect(listUnreportedDeliveries(db)).resolves.toEqual([
      {
        id: 1,
        name: "d.zip",
        status: "applied",
        attempts: 1,
        failure: null,
        receivedAt: new Date(RECEIVED),
        finishedAt: new Date(DONE),
        counts: { published: 2, replaced: 1, unchanged: 4 },
        errors: [],
      },
    ]);
    expect(fake.queries[0].sql).toContain(
      'where ("deliveries"."reported_at" is null and ("deliveries"."status" in ($1, $2) or ("deliveries"."status" = $3 and "deliveries"."attempts" >= $4))) order by "deliveries"."name" asc',
    );
    expect(fake.queries[0].params).toEqual([
      "applied",
      "rejected",
      "failed",
      3,
    ]);
  });

  it("prend la date du statut atteint, ou celle de réception à défaut", async () => {
    fake.reply([
      row("rejected", [null, DONE, null]),
      row("failed", [null, null, null]),
    ]);

    const [rejected, failed] = await listUnreportedDeliveries(db);

    expect(rejected.finishedAt).toEqual(new Date(DONE));
    expect(failed.finishedAt).toEqual(new Date(RECEIVED));
  });

  it.each(["received", "verifying", "applying"])(
    "refuse un dépôt %s, qui n'est pas à un statut final",
    async (status) => {
      fake.reply([row(status, [null, null, null])]);

      await expect(listUnreportedDeliveries(db)).rejects.toThrow(
        "d.zip n'est pas à un statut final",
      );
    },
  );
});

describe("markReported", () => {
  it("note la date du rapport", async () => {
    await markReported(db, 7);

    expect(fake.queries[0]).toEqual({
      sql: 'update "deliveries" set "reported_at" = now() where "deliveries"."id" = $1',
      params: [7],
    });
  });
});
