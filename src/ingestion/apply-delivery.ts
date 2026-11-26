import type { Database } from "../db/client";
import { markApplied, readDeliveryStatus } from "./delivery-rows";
import { assertTransition } from "./delivery-status";
import type { ImageStorage } from "./image-storage";
import { readNotebookStates } from "./notebook-state";
import { type ChangePlan, isWrite, planChanges, planCounts } from "./plan";
import { removeFiles } from "./remove-files";
import { refreshSearchCounts } from "./search-counts";
import { assertPlanCurrent } from "./stale-plan";
import { uploadImages } from "./upload-images";
import type { VerifiedDelivery } from "./verify-delivery";
import { writeNotebookVersion } from "./write-notebook-version";

export interface DeliveryToApply {
  // Ligne de `deliveries`, au statut `applying`.
  id: number;
  // ZIP vérifié, d'où les images sont recopiées.
  zipPath: string;
  verified: VerifiedDelivery;
}

export type ApplyResult =
  { kind: "applied"; plan: ChangePlan } | { kind: "already-applied" };

export interface ApplyDependencies {
  db: Database;
  storage: ImageStorage;
  log: (message: string) => void;
}

async function commit(
  db: Database,
  delivery: DeliveryToApply,
  plan: ChangePlan,
): Promise<void> {
  await db.transaction(async (tx) => {
    assertTransition(
      await readDeliveryStatus(tx, delivery.id, true),
      "applied",
    );
    assertPlanCurrent(
      plan,
      await readNotebookStates(tx, notebookIds(plan.delivery), true),
    );
    for (const change of plan.changes.filter(isWrite)) {
      await writeNotebookVersion(tx, change, delivery.id);
    }
    await markApplied(tx, delivery.id, planCounts(plan));
  });
}

function notebookIds({ notebooks }: VerifiedDelivery): string[] {
  return notebooks.map(({ notebook }) => notebook.id);
}

// Publie un dépôt vérifié :
// 1. copie les images des cahiers nouveaux, remplacés ou republiés sous des
//    clés de version encore non référencées ;
// 2. dans une transaction, relit sous verrou le dépôt et ses cahiers, écrit
//    chaque nouvelle version et passe le dépôt à `applied` ;
// 3. après le commit, supprime les images des versions remplacées, au mieux ;
// 4. recalcule les comptes de la recherche.
// Un arrêt avant le commit ne laisse rien de visible ; la relance planifie
// les mêmes versions et réécrit les mêmes clés. Appliquer un dépôt déjà
// appliqué ne fait que recalculer les comptes, que l'arrêt a pu laisser en
// retard.
export async function applyDelivery(
  { db, storage, log }: ApplyDependencies,
  delivery: DeliveryToApply,
): Promise<ApplyResult> {
  const status = await readDeliveryStatus(db, delivery.id, false);
  if (status === "applied") {
    await refreshSearchCounts(db);
    return { kind: "already-applied" };
  }
  assertTransition(status, "applied");
  const plan = planChanges(
    delivery.verified,
    await readNotebookStates(db, notebookIds(delivery.verified), false),
  );
  const writes = plan.changes.filter(isWrite);
  await uploadImages(
    delivery.zipPath,
    writes.flatMap(({ uploads }) => uploads),
    storage,
  );
  await commit(db, delivery, plan);
  await removeFiles(
    storage,
    writes.flatMap(({ removedKeys }) => removedKeys),
    log,
  );
  await refreshSearchCounts(db);
  return { kind: "applied", plan };
}
