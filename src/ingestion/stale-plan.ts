import type { ChangePlan, NotebookState } from "./plan";

function sameState(
  planned: NotebookState | null,
  locked: NotebookState | undefined,
): boolean {
  if (planned === null || locked === undefined) {
    return planned === null && locked === undefined;
  }
  return (
    planned.status === locked.status &&
    planned.onlineVersion === locked.onlineVersion &&
    planned.fingerprint === locked.fingerprint &&
    planned.latestVersion === locked.latestVersion
  );
}

// Le plan suppose un état de chaque cahier ; la transaction le relit sous
// verrou. Si un autre traitement est passé entre-temps (retrait, autre dépôt),
// rien n'est écrit : le dépôt échoue et sera replanifié à la relance.
export function assertPlanCurrent(
  plan: ChangePlan,
  locked: ReadonlyMap<string, NotebookState>,
): void {
  const stale = plan.changes
    .filter(
      ({ verified, current }) =>
        !sameState(current, locked.get(verified.notebook.id)),
    )
    .map(({ verified }) => verified.notebook.id);
  if (stale.length > 0) {
    throw new Error(
      `Cahiers modifiés pendant l'application du dépôt : ${stale.join(", ")}.`,
    );
  }
}
