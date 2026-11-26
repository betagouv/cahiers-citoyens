import type { Database } from "../db/client";
import type { SendAlert } from "./alert";
import type { ObjectStore } from "./object-store";
import { reportFinishedDeliveries } from "./report-deliveries";
import { type RunError, runError } from "./run-error";
import { alertStaleIncoming } from "./stale-incoming";
import { alertUnembeddedChunks } from "./unembedded-chunks";

export interface MonitorDependencies {
  db: Database;
  store: ObjectStore;
  alert: SendAlert;
  now: () => Date;
}

async function guarded(
  step: () => Promise<RunError[] | void>,
): Promise<RunError[]> {
  try {
    return (await step()) ?? [];
  } catch (error) {
    return [runError("monitor", error)];
  }
}

// Fin d'un job : rapports des dépôts terminés, puis alertes sur ce qui
// attend trop. Chaque étape court même si la précédente a échoué.
export async function monitorRun(
  deps: MonitorDependencies,
): Promise<RunError[]> {
  return [
    ...(await guarded(() => reportFinishedDeliveries(deps))),
    ...(await guarded(() => alertStaleIncoming(deps))),
    ...(await guarded(() => alertUnembeddedChunks(deps))),
  ];
}
