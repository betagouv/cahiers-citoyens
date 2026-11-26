import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import {
  MAX_ATTEMPTS,
  beginAttempt,
  claimDelivery,
  countPendingDeliveries,
  listPendingDeliveries,
  markApplied,
  markApplying,
  markRejected,
  moveDelivery,
  readDeliveryStatus,
} from "./delivery-rows";

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

const ROW = { id: 3, name: "delivery-2026-11-24-0930.zip", attempts: 1 };

describe("claimDelivery", () => {
  it("crée la ligne au statut received", async () => {
    fake.reply([["3", ROW.name, "received", 0]]);

    await expect(claimDelivery(db, ROW.name)).resolves.toEqual({
      row: { ...ROW, status: "received", attempts: 0 },
      created: true,
    });
    expect(fake.queries[0].sql).toMatch(
      /^insert into "deliveries" .* on conflict \("name"\) do nothing returning "id", "name", "status", "attempts"$/,
    );
    expect(fake.queries[0].params).toEqual([ROW.name]);
  });

  it("relit la ligne d'un dépôt déjà reçu", async () => {
    fake.reply([], [["3", ROW.name, "applied", 1]]);

    await expect(claimDelivery(db, ROW.name)).resolves.toEqual({
      row: { ...ROW, status: "applied" },
      created: false,
    });
    expect(fake.queries[1].params).toEqual([ROW.name]);
  });

  it("échoue si la ligne disparaît entre les deux requêtes", async () => {
    await expect(claimDelivery(db, ROW.name)).rejects.toThrow(
      `Dépôt introuvable : ${ROW.name}`,
    );
  });
});

describe("countPendingDeliveries", () => {
  it("compte les dépôts que le prochain job traitera", async () => {
    fake.reply([[2]]);

    await expect(countPendingDeliveries(db)).resolves.toBe(2);
    expect(fake.queries[0]).toEqual({
      sql: 'select count(*) from "deliveries" where ("deliveries"."status" in ($1, $2, $3) or ("deliveries"."status" = $4 and "deliveries"."attempts" < $5))',
      params: ["received", "verifying", "applying", "failed", MAX_ATTEMPTS],
    });
  });

  it("vaut 0 sans ligne", async () => {
    fake.reply([]);

    await expect(countPendingDeliveries(db)).resolves.toBe(0);
  });
});

describe("listPendingDeliveries", () => {
  it("liste les dépôts en cours et ceux en échec relançables, par nom", async () => {
    fake.reply([["3", ROW.name, "failed", 2]]);

    await expect(listPendingDeliveries(db)).resolves.toEqual([
      { ...ROW, status: "failed", attempts: 2 },
    ]);
    expect(fake.queries[0]).toEqual({
      sql: 'select "id", "name", "status", "attempts" from "deliveries" where ("deliveries"."status" in ($1, $2, $3) or ("deliveries"."status" = $4 and "deliveries"."attempts" < $5)) order by "deliveries"."name" asc',
      params: ["received", "verifying", "applying", "failed", MAX_ATTEMPTS],
    });
  });
});

describe("moveDelivery", () => {
  it("change le statut et date le nouveau, si le statut en base est l'ancien", async () => {
    fake.reply([["3"]]);

    await expect(
      moveDelivery(db, 3, "applying", "failed", { failure: "panne" }),
    ).resolves.toBe(true);
    expect(fake.queries[0]).toEqual({
      sql: 'update "deliveries" set "status" = $1, "failed_at" = now(), "failure" = $2 where ("deliveries"."id" = $3 and "deliveries"."status" = $4) returning "id"',
      params: ["failed", "panne", 3, "applying"],
    });
  });

  it("renvoie false si le statut a changé", async () => {
    await expect(moveDelivery(db, 3, "verifying", "applying")).resolves.toBe(
      false,
    );
  });

  it("refuse une transition interdite sans requête", async () => {
    await expect(moveDelivery(db, 3, "applied", "failed")).rejects.toThrow(
      "Transition de dépôt interdite : applied → failed",
    );
    expect(fake.queries).toEqual([]);
  });
});

describe("beginAttempt", () => {
  it("remet en vérification un dépôt reçu ou en échec et compte la tentative", async () => {
    fake.reply([["3"]], [["3"]]);

    await expect(
      beginAttempt(db, { ...ROW, status: "received" }),
    ).resolves.toBe("verifying");
    await expect(beginAttempt(db, { ...ROW, status: "failed" })).resolves.toBe(
      "verifying",
    );
    expect(fake.queries[0]).toEqual({
      sql: 'update "deliveries" set "status" = $1, "verifying_at" = now(), "attempts" = "deliveries"."attempts" + 1 where ("deliveries"."id" = $2 and "deliveries"."status" = $3) returning "id"',
      params: ["verifying", 3, "received"],
    });
    expect(fake.queries[1].params).toEqual(["verifying", 3, "failed"]);
  });

  it("garde le statut d'un dépôt interrompu et compte la tentative", async () => {
    fake.reply([["3"]]);

    await expect(
      beginAttempt(db, { ...ROW, status: "applying" }),
    ).resolves.toBe("applying");
    expect(fake.queries[0]).toEqual({
      sql: 'update "deliveries" set "attempts" = "deliveries"."attempts" + 1 where ("deliveries"."id" = $1 and "deliveries"."status" = $2) returning "id"',
      params: [3, "applying"],
    });
  });

  it("échoue si le statut a changé entre temps", async () => {
    await expect(
      beginAttempt(db, { ...ROW, status: "verifying" }),
    ).rejects.toThrow(`${ROW.name} a changé de statut pendant le traitement`);
  });
});

describe("markRejected et markApplying", () => {
  const row = { ...ROW, status: "verifying" as const };
  const errors = [
    { file: ROW.name, code: "empty-delivery" as const, message: "vide" },
  ];

  it("passent un dépôt en vérification à rejected, avec ses erreurs, ou à applying", async () => {
    fake.reply([["3"]], [["3"]]);

    await markRejected(db, row, errors);
    await markApplying(db, row);

    expect(fake.queries.map(({ params }) => params)).toEqual([
      ["rejected", JSON.stringify(errors), 3, "verifying"],
      ["applying", 3, "verifying"],
    ]);
  });

  it("échouent si le dépôt n'est plus en vérification", async () => {
    await expect(markRejected(db, row, errors)).rejects.toThrow(
      "a changé de statut",
    );
    await expect(markApplying(db, row)).rejects.toThrow("a changé de statut");
  });
});
