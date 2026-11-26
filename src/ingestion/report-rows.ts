import { and, asc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { deliveries } from "../db/schema";
import { MAX_ATTEMPTS } from "./delivery-rows";
import type { FinishedDelivery, ReportStatus } from "./delivery-report";

export interface UnreportedDelivery extends FinishedDelivery {
  id: number;
  attempts: number;
  failure: string | null;
}

const COLUMNS = {
  id: deliveries.id,
  name: deliveries.name,
  status: deliveries.status,
  attempts: deliveries.attempts,
  failure: deliveries.failure,
  receivedAt: deliveries.receivedAt,
  appliedAt: deliveries.appliedAt,
  rejectedAt: deliveries.rejectedAt,
  failedAt: deliveries.failedAt,
  published: deliveries.publishedCount,
  replaced: deliveries.replacedCount,
  unchanged: deliveries.unchangedCount,
  errors: deliveries.errors,
};

function selectUnreported(db: Database) {
  return db
    .select(COLUMNS)
    .from(deliveries)
    .where(
      and(
        isNull(deliveries.reportedAt),
        or(
          inArray(deliveries.status, ["applied", "rejected"]),
          and(
            eq(deliveries.status, "failed"),
            gte(deliveries.attempts, MAX_ATTEMPTS),
          ),
        ),
      ),
    )
    .orderBy(asc(deliveries.name));
}

type Row = Awaited<ReturnType<typeof selectUnreported>>[number];

function finishedStatus(row: Row): ReportStatus {
  switch (row.status) {
    case "applied":
    case "rejected":
    case "failed":
      return row.status;
    case "received":
    case "verifying":
    case "applying":
      throw new Error(`${row.name} n'est pas à un statut final`);
  }
}

function finishedAt(row: Row, status: ReportStatus): Date {
  const at = {
    applied: row.appliedAt,
    rejected: row.rejectedAt,
    failed: row.failedAt,
  }[status];
  // Toujours renseignée par `moveDelivery` ; la date de réception à défaut.
  return at ?? row.receivedAt;
}

function toUnreported(row: Row): UnreportedDelivery {
  const status = finishedStatus(row);
  return {
    id: row.id,
    name: row.name,
    status,
    attempts: row.attempts,
    failure: row.failure,
    receivedAt: row.receivedAt,
    finishedAt: finishedAt(row, status),
    counts: {
      published: row.published,
      replaced: row.replaced,
      unchanged: row.unchanged,
    },
    errors: row.errors,
  };
}

// Dépôts arrivés à un statut final (`failed` compris, une fois les tentatives
// épuisées) dont le rapport reste à écrire, par ordre de nom.
export async function listUnreportedDeliveries(
  db: Database,
): Promise<UnreportedDelivery[]> {
  return (await selectUnreported(db)).map(toUnreported);
}

export async function markReported(db: Database, id: number): Promise<void> {
  await db
    .update(deliveries)
    .set({ reportedAt: sql`now()` })
    .where(eq(deliveries.id, id));
}
