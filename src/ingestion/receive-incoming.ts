import type { Database } from "../db/client";
import { claimDelivery } from "./delivery-rows";
import type { ObjectStore } from "./object-store";
import { type RunError, runError } from "./run-error";

export const INCOMING_PREFIX = "incoming/";
export const DELIVERIES_PREFIX = "deliveries/";

export interface ReceiveDependencies {
  db: Database;
  store: ObjectStore;
}

export interface ReceiveResult {
  errors: RunError[];
  // Dépôts non déplacés vers `deliveries/`, à ne pas traiter dans ce job.
  left: string[];
}

// Noms des ZIP déposés à la racine de `incoming/`, par ordre de nom, donc
// d'horodatage. Le nom lui-même est contrôlé à la vérification, qui refuse le
// dépôt s'il ne suit pas `delivery-AAAA-MM-JJ-HHMM.zip`.
export function incomingNames(keys: readonly string[]): string[] {
  return keys
    .filter((key) => key.startsWith(INCOMING_PREFIX))
    .map((key) => key.slice(INCOMING_PREFIX.length))
    .filter((name) => name.endsWith(".zip") && !name.includes("/"))
    .sort();
}

function alreadyProcessed(name: string, status: string): Error {
  return new Error(
    `${name} a déjà été traité (${status}) : renvoi supprimé de incoming/ sans traitement. Un nouveau dépôt prend un nouvel horodatage.`,
  );
}

async function receive(
  { db, store }: ReceiveDependencies,
  name: string,
): Promise<void> {
  const incoming = `${INCOMING_PREFIX}${name}`;
  const { row, created } = await claimDelivery(db, name);
  if (!created && (row.status === "applied" || row.status === "rejected")) {
    await store.remove(incoming);
    throw alreadyProcessed(name, row.status);
  }
  // Copie puis suppression : un arrêt entre les deux laisse le ZIP aux deux
  // endroits, et la reprise recopie les mêmes octets.
  await store.copy(incoming, `${DELIVERIES_PREFIX}${name}`);
  await store.remove(incoming);
}

// Enregistre chaque ZIP de `incoming/` au statut `received` et le déplace
// dans `deliveries/`, d'où il est ensuite traité.
export async function receiveIncoming(
  deps: ReceiveDependencies,
): Promise<ReceiveResult> {
  const errors: RunError[] = [];
  const left: string[] = [];
  for (const name of incomingNames(await deps.store.list(INCOMING_PREFIX))) {
    try {
      await receive(deps, name);
    } catch (error) {
      errors.push(runError(name, error));
      left.push(name);
    }
  }
  return { errors, left };
}
