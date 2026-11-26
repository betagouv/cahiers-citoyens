import { toSearchName } from "../../src/geography/search-name";
import type { Movement } from "./movements";

// Une commune de 2019 disparue depuis : son code, son nom et son département
// au 1er janvier 2019, et le code de la commune actuelle qui l'a absorbée.
export interface CodeChange {
  oldCode: string;
  currentCode: string;
  name: string;
  departmentCode: string;
  searchName: string;
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

function isCodeChange(movement: Movement): boolean {
  return (
    CODE_CHANGING_KINDS.has(movement.kind) &&
    movement.typeAfter === "COM" &&
    movement.codeBefore !== movement.codeAfter
  );
}

// Ce que les mouvements disent d'un code de 2019 : son nom au 1er janvier
// 2019, libellé « avant » de son premier événement postérieur (un changement
// de nom précède parfois la fusion), et ses changements de code par date.
interface CodeEvents {
  name: string;
  edges: Movement[];
}

function eventsByCode(movements: Movement[], since: string) {
  const events = new Map<string, CodeEvents>();
  const sorted = movements
    .filter(
      (movement) =>
        movement.effectiveOn > since && movement.typeBefore === "COM",
    )
    .sort((a, b) => a.effectiveOn.localeCompare(b.effectiveOn));
  for (const movement of sorted) {
    const entry = events.get(movement.codeBefore) ?? {
      name: movement.nameBefore,
      edges: [],
    };
    if (isCodeChange(movement)) entry.edges.push(movement);
    events.set(movement.codeBefore, entry);
  }
  return events;
}

// Département d'un code INSEE : trois caractères outre-mer (97x, 98x), deux
// ailleurs, Corse (2A, 2B) comprise.
export function departmentOfCode(code: string): string {
  return code.startsWith("97") || code.startsWith("98")
    ? code.slice(0, 3)
    : code.slice(0, 2);
}

// Suit les changements d'un code dans l'ordre des dates. Un code déjà visité
// arrête la chaîne : un cycle ne boucle pas.
function follow(code: string, events: Map<string, CodeEvents>): string {
  const visited = new Set<string>();
  let current = code;
  let after = "";
  while (!visited.has(current)) {
    visited.add(current);
    const next = events
      .get(current)
      ?.edges.find((edge) => edge.effectiveOn >= after);
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
  const events = eventsByCode(movements, since);
  const changes: CodeChange[] = [];
  const unresolved: string[] = [];
  const sorted = [...events].sort(([a], [b]) => a.localeCompare(b));
  for (const [oldCode, { name, edges }] of sorted) {
    if (edges.length === 0 || currentCodes.has(oldCode)) continue;
    const currentCode = follow(oldCode, events);
    if (!currentCodes.has(currentCode)) {
      unresolved.push(oldCode);
      continue;
    }
    changes.push({
      oldCode,
      currentCode,
      name,
      departmentCode: departmentOfCode(oldCode),
      searchName: toSearchName(name),
    });
  }
  return { changes, unresolved };
}
