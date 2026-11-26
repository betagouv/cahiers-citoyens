import type { Database } from "../db/client";
import type { SendAlert } from "./alert";
import { claimNotice } from "./alert-notices";
import type { ObjectStore } from "./object-store";
import { INCOMING_PREFIX, incomingNames } from "./receive-incoming";
import { type RunError, runError } from "./run-error";

// Le job relève `incoming/` toutes les 10 min : une archive encore là après
// 30 min n'a pas pu être reçue.
export const STALE_INCOMING_MS = 30 * 60 * 1000;

export interface StaleIncomingDependencies {
  db: Database;
  store: ObjectStore;
  alert: SendAlert;
  now: () => Date;
}

async function check(
  { db, store, alert, now }: StaleIncomingDependencies,
  name: string,
): Promise<void> {
  const key = `${INCOMING_PREFIX}${name}`;
  const at = now();
  const waitedMs = at.getTime() - (await store.modifiedAt(key)).getTime();
  if (waitedMs <= STALE_INCOMING_MS) return;
  if (!(await claimNotice(db, `incoming.stale:${name}`, at))) return;
  const minutes = Math.floor(waitedMs / 60_000);
  await alert({
    event: "incoming.stale",
    text: `${name} attend dans incoming/ depuis ${minutes} min.`,
    details: { delivery: name, minutes },
  });
}

// Après la réception : alerte sur chaque ZIP resté dans `incoming/` plus de
// 30 min, au plus une fois par jour et par ZIP.
export async function alertStaleIncoming(
  deps: StaleIncomingDependencies,
): Promise<RunError[]> {
  const errors: RunError[] = [];
  for (const name of incomingNames(await deps.store.list(INCOMING_PREFIX))) {
    try {
      await check(deps, name);
    } catch (error) {
      errors.push(runError(name, error));
    }
  }
  return errors;
}
