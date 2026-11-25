import type { Movement } from "./movements";

export interface CodeChange {
  oldCode: string;
  currentCode: string;
}

export interface CodeHistory {
  changes: CodeChange[];
  // Codes partis vers une commune qui n'existe plus aujourd'hui : signalés,
  // pas enregistrés.
  unresolved: string[];
}

// Les cahiers datent de début 2019 et portent les codes du COG 2019, en vigueur
// au 1er janvier 2019 : seuls les événements postérieurs changent un code.
export const COG_2019_DATE = "2019-01-01";

// Événements où une commune disparaît au profit d'une autre ou change de
// code : fusion simple (31), commune nouvelle (32), fusion-association (33),
// changement de département (41) ou de chef-lieu (50). Les créations et
// rétablissements (20, 21) laissent le code d'origine en place.
const CODE_CHANGING_KINDS = new Set(["31", "32", "33", "41", "50"]);

function isCodeChange(movement: Movement, since: string): boolean {
  return (
    CODE_CHANGING_KINDS.has(movement.kind) &&
    movement.effectiveOn > since &&
    movement.typeBefore === "COM" &&
    movement.typeAfter === "COM" &&
    movement.codeBefore !== movement.codeAfter
  );
}

function edgesByCode(movements: Movement[], since: string) {
  const edges = new Map<string, Movement[]>();
  const sorted = movements
    .filter((movement) => isCodeChange(movement, since))
    .sort((a, b) => a.effectiveOn.localeCompare(b.effectiveOn));
  for (const movement of sorted) {
    const list = edges.get(movement.codeBefore) ?? [];
    list.push(movement);
    edges.set(movement.codeBefore, list);
  }
  return edges;
}

// Suit les changements d'un code dans l'ordre des dates. Un code déjà visité
// arrête la chaîne : un cycle ne boucle pas.
function follow(code: string, edges: Map<string, Movement[]>): string {
  const visited = new Set<string>();
  let current = code;
  let after = "";
  while (!visited.has(current)) {
    visited.add(current);
    const next = edges.get(current)?.find((edge) => edge.effectiveOn >= after);
    if (next === undefined) break;
    current = next.codeAfter;
    after = next.effectiveOn;
  }
  return current;
}

// Associe chaque code disparu depuis `since` au code de la commune actuelle
// qui l'a absorbé. Un code encore actuel n'est pas repris, même s'il a changé
// puis été rétabli.
export function resolveCodeHistory(
  movements: Movement[],
  currentCodes: ReadonlySet<string>,
  since: string = COG_2019_DATE,
): CodeHistory {
  const edges = edgesByCode(movements, since);
  const changes: CodeChange[] = [];
  const unresolved: string[] = [];
  for (const oldCode of [...edges.keys()].sort()) {
    if (currentCodes.has(oldCode)) continue;
    const currentCode = follow(oldCode, edges);
    if (currentCodes.has(currentCode)) changes.push({ oldCode, currentCode });
    else unresolved.push(oldCode);
  }
  return { changes, unresolved };
}
