import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "../db/client";
import { applyDelivery } from "./apply-delivery";
import {
  type DeliveryRow,
  MAX_ATTEMPTS,
  beginAttempt,
  markApplying,
  markRejected,
  moveDelivery,
  readDeliveryStatus,
} from "./delivery-rows";
import type { DeliveryStatus } from "./delivery-status";
import { errorMessage } from "./error-message";
import type { ImageStorage } from "./image-storage";
import type { ObjectStore } from "./object-store";
import { DELIVERIES_PREFIX } from "./receive-incoming";
import { type RunError, runError } from "./run-error";
import { verifyDelivery } from "./verify-delivery";

export interface ProcessDependencies {
  db: Database;
  store: ObjectStore;
  images: ImageStorage;
  log: (message: string) => void;
}

export interface DeliveryMove {
  name: string;
  from: DeliveryStatus;
  to: DeliveryStatus;
}

export interface ProcessResult {
  move: DeliveryMove;
  errors: RunError[];
}

// Télécharge le ZIP dans un dossier temporaire, supprimé ensuite quoi qu'il
// arrive : le conteneur du cron a peu de disque.
async function withDownload<T>(
  store: ObjectStore,
  name: string,
  consume: (zipPath: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "ingest-"));
  try {
    const zipPath = join(dir, name);
    await store.download(`${DELIVERIES_PREFIX}${name}`, zipPath);
    return await consume(zipPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function verifyAndApply(
  deps: ProcessDependencies,
  row: DeliveryRow,
): Promise<DeliveryStatus> {
  const status = await beginAttempt(deps.db, row);
  return withDownload(deps.store, row.name, async (zipPath) => {
    const result = await verifyDelivery(zipPath);
    if (!result.ok) {
      await markRejected(deps.db, row, result.errors);
      return "rejected";
    }
    if (status === "verifying") await markApplying(deps.db, row);
    await applyDelivery(
      { db: deps.db, storage: deps.images, log: deps.log },
      { id: row.id, zipPath, verified: result.delivery },
    );
    return "applied";
  });
}

// Passe le dépôt à `failed` avec le message. S'il a quitté son statut entre
// temps (appliqué, puis le recalcul des comptes a échoué), il le garde.
async function markFailed(
  db: Database,
  id: number,
  message: string,
): Promise<DeliveryStatus> {
  const status = await readDeliveryStatus(db, id, false);
  if (status === "applied" || status === "rejected" || status === "failed") {
    return status;
  }
  await moveDelivery(db, id, status, "failed", { failure: message });
  return "failed";
}

function exhausted(row: DeliveryRow): Error {
  return new Error(
    `${row.name} abandonné après ${row.attempts} tentatives interrompues`,
  );
}

// Mène un dépôt de `deliveries/` jusqu'à `applied` ou `rejected`. Une erreur
// de notre côté le passe à `failed`, relancé par les jobs suivants tant qu'il
// reste des tentatives.
export async function processDelivery(
  deps: ProcessDependencies,
  row: DeliveryRow,
): Promise<ProcessResult> {
  function move(to: DeliveryStatus): DeliveryMove {
    return { name: row.name, from: row.status, to };
  }
  const errors: RunError[] = [];
  try {
    if (row.attempts >= MAX_ATTEMPTS) throw exhausted(row);
    return { move: move(await verifyAndApply(deps, row)), errors };
  } catch (error) {
    errors.push(runError(row.name, error));
    try {
      return {
        move: move(await markFailed(deps.db, row.id, errorMessage(error))),
        errors,
      };
    } catch (markError) {
      errors.push(runError(row.name, markError));
      return { move: move(row.status), errors };
    }
  }
}
