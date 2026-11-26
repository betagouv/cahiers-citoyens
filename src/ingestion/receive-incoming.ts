import type { Database } from "../db/client";
import type { SendAlert } from "./alert";
import { rejectedAlert } from "./delivery-alerts";
import {
  buildDuplicateReport,
  duplicateReportKey,
  serializeReport,
} from "./delivery-report";
import { claimDelivery } from "./delivery-rows";
import type { ObjectStore } from "./object-store";
import { type RunError, runError } from "./run-error";

export const INCOMING_PREFIX = "incoming/";
export const DELIVERIES_PREFIX = "deliveries/";

export interface ReceiveDependencies {
  db: Database;
  store: ObjectStore;
  alert: SendAlert;
  now: () => Date;
}

export interface ReceiveResult {
  errors: RunError[];
  // Dépôts non déplacés vers `deliveries/`, à ne pas traiter dans ce job.
  left: string[];
  // Renvois d'un nom déjà traité, refusés avec un rapport à part.
  duplicates: string[];
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

// Le protocole veut un nouvel horodatage par dépôt : un renvoi est refusé
// sans être lu, avec son propre rapport, et le rapport d'origine reste.
// Rapport écrit avant la suppression : un arrêt entre les deux laisse le ZIP,
// et le job suivant réécrit le même refus.
async function refuseDuplicate(
  { store, alert, now }: ReceiveDependencies,
  name: string,
): Promise<void> {
  const report = buildDuplicateReport(name, now());
  await store.writeJson(duplicateReportKey(name), serializeReport(report));
  await store.remove(`${INCOMING_PREFIX}${name}`);
  await alert(rejectedAlert(name, report.errors));
}

// Renvoie false pour un renvoi refusé.
async function receive(
  deps: ReceiveDependencies,
  name: string,
): Promise<boolean> {
  const incoming = `${INCOMING_PREFIX}${name}`;
  const { row, created } = await claimDelivery(deps.db, name);
  if (!created && (row.status === "applied" || row.status === "rejected")) {
    await refuseDuplicate(deps, name);
    return false;
  }
  // Copie puis suppression : un arrêt entre les deux laisse le ZIP aux deux
  // endroits, et la reprise recopie les mêmes octets.
  await deps.store.copy(incoming, `${DELIVERIES_PREFIX}${name}`);
  await deps.store.remove(incoming);
  return true;
}

// Enregistre chaque ZIP de `incoming/` au statut `received` et le déplace
// dans `deliveries/`, d'où il est ensuite traité.
export async function receiveIncoming(
  deps: ReceiveDependencies,
): Promise<ReceiveResult> {
  const errors: RunError[] = [];
  const left: string[] = [];
  const duplicates: string[] = [];
  for (const name of incomingNames(await deps.store.list(INCOMING_PREFIX))) {
    try {
      if (!(await receive(deps, name))) duplicates.push(name);
    } catch (error) {
      errors.push(runError(name, error));
      left.push(name);
    }
  }
  return { errors, left, duplicates };
}
