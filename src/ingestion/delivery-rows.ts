import { eq, sql } from "drizzle-orm";
import type { Database, Transaction } from "../db/client";
import { deliveries } from "../db/schema";
import type { DeliveryStatus } from "./delivery-status";
import type { PlanCounts } from "./plan";

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
