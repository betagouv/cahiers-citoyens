import type { Database } from "../db/client";
import type { SendAlert } from "./alert";
import { failedAlert, rejectedAlert } from "./delivery-alerts";
import {
  buildDeliveryReport,
  reportKey,
  serializeReport,
} from "./delivery-report";
import type { ObjectStore } from "./object-store";
import {
  type UnreportedDelivery,
  listUnreportedDeliveries,
  markReported,
} from "./report-rows";
import { type RunError, runError } from "./run-error";

export interface ReportDependencies {
  db: Database;
  store: ObjectStore;
  alert: SendAlert;
}

async function report(
  { db, store, alert }: ReportDependencies,
  delivery: UnreportedDelivery,
): Promise<void> {
  const written = buildDeliveryReport(delivery);
  await store.writeJson(reportKey(delivery.name), serializeReport(written));
  await markReported(db, delivery.id);
  switch (delivery.status) {
    case "applied":
      return;
    case "rejected":
      return alert(rejectedAlert(delivery.name, written.errors));
    case "failed":
      return alert(
        failedAlert(delivery.name, delivery.attempts, delivery.failure),
      );
  }
}

// Écrit `reports/<nom>.json` pour chaque dépôt arrivé à un statut final, puis
// le note en base et prévient l'équipe d'un refus ou d'un abandon. Un rapport
// impossible à écrire est réessayé au job suivant ; le réécrire donne le même
// fichier.
export async function reportFinishedDeliveries(
  deps: ReportDependencies,
): Promise<RunError[]> {
  const errors: RunError[] = [];
  for (const delivery of await listUnreportedDeliveries(deps.db)) {
    try {
      await report(deps, delivery);
    } catch (error) {
      errors.push(runError(delivery.name, error));
    }
  }
  return errors;
}
