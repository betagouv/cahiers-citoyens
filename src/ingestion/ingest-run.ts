import type { Database } from "../db/client";
import type { SendAlert } from "./alert";
import { listPendingDeliveries } from "./delivery-rows";
import type { ImageStorage } from "./image-storage";
import { INGEST_JOB, recordJobRun } from "./job-runs";
import { monitorRun } from "./monitor-run";
import type { ObjectStore } from "./object-store";
import { type DeliveryMove, processDelivery } from "./process-delivery";
import { receiveIncoming } from "./receive-incoming";
import { type RunError, runError } from "./run-error";
import type { RunLock } from "./run-lock";

// Vectorise les chunks sans embedding et renvoie leur nombre.
export type EmbedPending = () => Promise<number>;

export interface IngestDependencies {
  db: Database;
  lock: RunLock;
  store: ObjectStore;
  images: ImageStorage;
  // Absent sans clé Albert : les chunks attendent un job configuré.
  embedPending: EmbedPending | undefined;
  alert: SendAlert;
  now: () => Date;
  log: (message: string) => void;
}

// Une ligne JSON par exécution, sur la sortie standard.
export interface JobRun {
  event: "ingest.run";
  startedAt: string;
  finishedAt: string;
  // Une autre exécution tenait le verrou : rien n'a été fait.
  locked: boolean;
  deliveries: DeliveryMove[];
  // Renvois d'un nom déjà traité, refusés par un rapport `.duplicate.json`.
  duplicates: string[];
  embedded: number;
  errors: RunError[];
}

async function processDeliveries(
  deps: IngestDependencies,
): Promise<Pick<JobRun, "deliveries" | "duplicates" | "errors">> {
  const received = await receiveIncoming(deps);
  const errors = [...received.errors];
  const deliveries: DeliveryMove[] = [];
  const pending = await listPendingDeliveries(deps.db);
  for (const row of pending.filter(
    ({ name }) => !received.left.includes(name),
  )) {
    const result = await processDelivery(deps, row);
    deliveries.push(result.move);
    errors.push(...result.errors);
  }
  return { deliveries, duplicates: received.duplicates, errors };
}

// Une panne d'Albert ne touche pas les dépôts : ils restent `applied`, la
// recherche plein texte marche déjà, et le job suivant reprend les chunks.
async function embed(
  embedPending: EmbedPending | undefined,
): Promise<{ embedded: number; errors: RunError[] }> {
  if (embedPending === undefined) {
    return {
      embedded: 0,
      errors: [
        runError("embed", "ALBERT_API_KEY absente : chunks non vectorisés"),
      ],
    };
  }
  try {
    return { embedded: await embedPending(), errors: [] };
  } catch (error) {
    return { embedded: 0, errors: [runError("embed", error)] };
  }
}

type RunResult = Omit<JobRun, "event" | "startedAt" | "finishedAt">;

function emptyRun(locked: boolean, errors: RunError[]): RunResult {
  return { locked, deliveries: [], duplicates: [], embedded: 0, errors };
}

async function runLocked(deps: IngestDependencies): Promise<RunResult> {
  if (!(await deps.lock.tryAcquire())) {
    deps.log("Une autre exécution du job ingest tient le verrou : arrêt.");
    return emptyRun(true, []);
  }
  const processed = await processDeliveries(deps);
  const embedding = await embed(deps.embedPending);
  const monitored = await monitorRun(deps);
  return {
    locked: false,
    deliveries: processed.deliveries,
    duplicates: processed.duplicates,
    embedded: embedding.embedded,
    errors: [...processed.errors, ...embedding.errors, ...monitored],
  };
}

// `ingest run` : relève `incoming/`, mène chaque dépôt jusqu'à `applied` ou
// `rejected`, reprend ceux qu'un job précédent a laissés en cours ou en échec,
// vectorise les nouveaux chunks, écrit les rapports et lance les alertes.
// Ne lève pas : toute erreur finit dans le `JobRun`.
export async function runIngest(deps: IngestDependencies): Promise<JobRun> {
  const startedAt = deps.now();
  let result: RunResult;
  try {
    result = await runLocked(deps);
  } catch (error) {
    result = emptyRun(false, [runError("run", error)]);
  }
  try {
    await deps.lock.release();
  } catch (error) {
    result.errors.push(runError("run", error));
  }
  const finishedAt = deps.now();
  // Lu par `/api/health`. Une exécution sortie sur le verrou ne compte pas :
  // celle qui le tient notera son passage.
  if (!result.locked) await record(deps.db, startedAt, finishedAt, result);
  return {
    event: "ingest.run",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    ...result,
  };
}

async function record(
  db: Database,
  startedAt: Date,
  finishedAt: Date,
  result: RunResult,
): Promise<void> {
  try {
    await recordJobRun(db, {
      job: INGEST_JOB,
      startedAt,
      finishedAt,
      errorCount: result.errors.length,
    });
  } catch (error) {
    result.errors.push(runError("run", error));
  }
}
