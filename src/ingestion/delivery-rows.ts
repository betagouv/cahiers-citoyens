import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Database, Transaction } from "../db/client";
import { deliveries } from "../db/schema";
import { type DeliveryStatus, assertTransition } from "./delivery-status";
import type { IngestError } from "./errors";
import type { PlanCounts } from "./plan";

// Au-delà, un dépôt `failed` n'est plus relancé : il attend une intervention.
export const MAX_ATTEMPTS = 3;

export interface DeliveryRow {
  id: number;
  name: string;
  status: DeliveryStatus;
  attempts: number;
}

type DeliveryUpdate = PgUpdateSetSource<typeof deliveries>;

const STATUS_TIMESTAMPS = {
  received: "receivedAt",
  verifying: "verifyingAt",
  applying: "applyingAt",
  applied: "appliedAt",
  rejected: "rejectedAt",
  failed: "failedAt",
} as const satisfies Record<DeliveryStatus, keyof DeliveryUpdate>;

const ROW = {
  id: deliveries.id,
  name: deliveries.name,
  status: deliveries.status,
  attempts: deliveries.attempts,
};

// Statut du dépôt `id`. Avec `lock`, dans une transaction, la ligne reste
// verrouillée jusqu'au commit : deux applications du même dépôt passent
// l'une après l'autre.
export async function readDeliveryStatus(
  db: Database | Transaction,
  id: number,
  lock: boolean,
): Promise<DeliveryStatus> {
  const query = db
    .select({ status: deliveries.status })
    .from(deliveries)
    .where(eq(deliveries.id, id));
  const [row] = await (lock ? query.for("update") : query);
  if (row === undefined) throw new Error(`Dépôt inconnu : ${id}`);
  return row.status;
}

export async function markApplied(
  tx: Transaction,
  id: number,
  counts: PlanCounts,
): Promise<void> {
  await tx
    .update(deliveries)
    .set({
      status: "applied",
      appliedAt: sql`now()`,
      publishedCount: counts.published,
      replacedCount: counts.replaced,
      unchangedCount: counts.unchanged,
    })
    .where(eq(deliveries.id, id));
}

// Ligne du dépôt `name`, créée au statut `received` si elle n'existe pas.
// `created` vaut false quand un job précédent l'a déjà reçu.
export async function claimDelivery(
  db: Database,
  name: string,
): Promise<{ row: DeliveryRow; created: boolean }> {
  const [inserted] = await db
    .insert(deliveries)
    .values({ name })
    .onConflictDoNothing({ target: deliveries.name })
    .returning(ROW);
  if (inserted !== undefined) return { row: inserted, created: true };
  const [existing] = await db
    .select(ROW)
    .from(deliveries)
    .where(eq(deliveries.name, name));
  if (existing === undefined) throw new Error(`Dépôt introuvable : ${name}`);
  return { row: existing, created: false };
}

// Dépôts à traiter, par ordre de nom : ceux qu'un job interrompu a laissés en
// cours, et ceux en échec qui ont encore droit à une relance.
export function listPendingDeliveries(db: Database): Promise<DeliveryRow[]> {
  return db
    .select(ROW)
    .from(deliveries)
    .where(
      or(
        inArray(deliveries.status, ["received", "verifying", "applying"]),
        and(
          eq(deliveries.status, "failed"),
          lt(deliveries.attempts, MAX_ATTEMPTS),
        ),
      ),
    )
    .orderBy(asc(deliveries.name));
}

// Passe le dépôt de `from` à `to`, avec la date du nouveau statut. Ne change
// rien et renvoie false si le statut en base n'est plus `from`.
export async function moveDelivery(
  db: Database,
  id: number,
  from: DeliveryStatus,
  to: DeliveryStatus,
  fields: DeliveryUpdate = {},
): Promise<boolean> {
  assertTransition(from, to);
  const updated = await db
    .update(deliveries)
    .set({ ...fields, status: to, [STATUS_TIMESTAMPS[to]]: sql`now()` })
    .where(and(eq(deliveries.id, id), eq(deliveries.status, from)))
    .returning({ id: deliveries.id });
  return updated.length > 0;
}

// Compte une tentative et remet en vérification un dépôt reçu ou en échec.
// Un dépôt laissé en `verifying` ou `applying` par un job interrompu garde son
// statut : la vérification refaite le mène à la suite. Renvoie le statut.
export async function beginAttempt(
  db: Database,
  row: DeliveryRow,
): Promise<DeliveryStatus> {
  const restart = row.status === "received" || row.status === "failed";
  const status = restart ? "verifying" : row.status;
  const counted = restart
    ? await moveDelivery(db, row.id, row.status, status, {
        attempts: sql`${deliveries.attempts} + 1`,
      })
    : await countAttempt(db, row);
  if (!counted) throw changedElsewhere(row.name);
  return status;
}

async function countAttempt(db: Database, row: DeliveryRow): Promise<boolean> {
  const updated = await db
    .update(deliveries)
    .set({ attempts: sql`${deliveries.attempts} + 1` })
    .where(and(eq(deliveries.id, row.id), eq(deliveries.status, row.status)))
    .returning({ id: deliveries.id });
  return updated.length > 0;
}

export function changedElsewhere(name: string): Error {
  return new Error(`${name} a changé de statut pendant le traitement`);
}

export async function markRejected(
  db: Database,
  row: DeliveryRow,
  errors: IngestError[],
): Promise<void> {
  if (!(await moveDelivery(db, row.id, "verifying", "rejected", { errors }))) {
    throw changedElsewhere(row.name);
  }
}

export async function markApplying(
  db: Database,
  row: DeliveryRow,
): Promise<void> {
  if (!(await moveDelivery(db, row.id, "verifying", "applying"))) {
    throw changedElsewhere(row.name);
  }
}
