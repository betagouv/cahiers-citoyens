import type { Database } from "../db/client";
import { listPendingDeliveries } from "./delivery-rows";
import type { ImageStorage } from "./image-storage";
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
  now: () => Date;
  log: (message: string) => void;
}

// Une ligne JSON par exécution, lue par le monitoring (phase 9).
export interface JobRun {
  event: "ingest.run";
  startedAt: string;
  finishedAt: string;
  // Une autre exécution tenait le verrou : rien n'a été fait.
  locked: boolean;
  deliveries: DeliveryMove[];
  embedded: number;
  errors: RunError[];
}

async function processDeliveries(
  deps: IngestDependencies,
): Promise<Pick<JobRun, "deliveries" | "errors">> {
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
  return { deliveries, errors };
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

async function runLocked(
  deps: IngestDependencies,
): Promise<Omit<JobRun, "event" | "startedAt" | "finishedAt">> {
  if (!(await deps.lock.tryAcquire())) {
    deps.log("Une autre exécution du job ingest tient le verrou : arrêt.");
    return { locked: true, deliveries: [], embedded: 0, errors: [] };
  }
  const processed = await processDeliveries(deps);
  const embedding = await embed(deps.embedPending);
  return {
    locked: false,
    deliveries: processed.deliveries,
    embedded: embedding.embedded,
    errors: [...processed.errors, ...embedding.errors],
  };
}

// `ingest run` : relève `incoming/`, mène chaque dépôt jusqu'à `applied` ou
// `rejected`, reprend ceux qu'un job précédent a laissés en cours ou en échec,
// puis vectorise les nouveaux chunks. Ne lève pas : toute erreur finit dans
// le rapport.
export async function runIngest(deps: IngestDependencies): Promise<JobRun> {
  const startedAt = deps.now().toISOString();
  let result: Omit<JobRun, "event" | "startedAt" | "finishedAt">;
  try {
    result = await runLocked(deps);
  } catch (error) {
    result = {
      locked: false,
      deliveries: [],
      embedded: 0,
      errors: [runError("run", error)],
    };
  }
  try {
    await deps.lock.release();
  } catch (error) {
    result.errors.push(runError("run", error));
  }
  return {
    event: "ingest.run",
    startedAt,
    finishedAt: deps.now().toISOString(),
    ...result,
  };
}
