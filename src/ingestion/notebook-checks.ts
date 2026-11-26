import type { PageError } from "./errors";
import type { NotebookId } from "./notebook-id";

interface PageRef {
  number: unknown;
  id: unknown;
  lineIds: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pageRef(item: unknown): PageRef {
  if (!isRecord(item)) {
    return { number: undefined, id: undefined, lineIds: [] };
  }
  return {
    number: item.numero_page,
    id: item.id_page,
    lineIds: listOf(item.lignes).map((line) =>
      isRecord(line) ? line.id_ligne : undefined,
    ),
  };
}

// Un numéro que le schéma refuse n'est pas contrôlé ici : il ne doit pas
// entraîner d'autres erreurs.
function isPageNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function checkNotebookId(id: NotebookId, document: unknown): PageError[] {
  if (!isRecord(document) || typeof document.id_cahier !== "string") {
    return [];
  }
  if (document.id_cahier === id) {
    return [];
  }
  return [
    {
      code: "notebook-id-mismatch",
      message: `id_cahier vaut ${document.id_cahier}, ${id} attendu : il doit reprendre le nom du fichier JSON.`,
    },
  ];
}

function checkPageIds(
  id: NotebookId,
  page: PageRef,
  position: number,
): PageError[] {
  const number = page.number;
  if (!isPageNumber(number)) {
    return [];
  }
  const expected = `${id}_${number}`;
  const errors: PageError[] = [];
  if (typeof page.id === "string" && page.id !== expected) {
    errors.push({
      position,
      page: number,
      code: "invalid-page-id",
      message: `id_page vaut ${page.id}, ${expected} attendu (<id_cahier>_<numero_page>).`,
    });
  }
  page.lineIds.forEach((lineId, index) => {
    if (typeof lineId === "string" && !lineId.startsWith(`${expected}_`)) {
      errors.push({
        position,
        page: number,
        code: "invalid-line-id",
        message: `La ligne en position ${index + 1} a pour id_ligne ${lineId}, qui doit commencer par ${expected}_.`,
      });
    }
  });
  return errors;
}

function checkPageOrder(
  number: number,
  seen: ReadonlySet<number>,
  previous: number,
  position: number,
): PageError[] {
  if (seen.has(number)) {
    return [
      {
        position,
        page: number,
        code: "duplicate-page",
        message: `La page ${number} apparaît plusieurs fois.`,
      },
    ];
  }
  if (number < previous) {
    return [
      {
        position,
        page: number,
        code: "page-out-of-order",
        message: `La page ${number} suit la page ${previous} : les numéros de page doivent croître.`,
      },
    ];
  }
  return [];
}

// Contrôles hors schéma, lus sur un document pas encore validé : le rapport
// les liste en même temps que les erreurs de schéma. Les identifiants sont
// comparés au nom du fichier, pas à `id_cahier`, pour qu'une seule erreur
// n'en entraîne pas d'autres. `position` désigne le rang dans la liste `pages`,
// `page` le numéro déclaré, quand il est valide.
export function checkNotebook(id: NotebookId, document: unknown): PageError[] {
  const errors = checkNotebookId(id, document);
  const pages = isRecord(document) ? listOf(document.pages) : [];
  const seen = new Set<number>();
  let previous = 0;
  pages.map(pageRef).forEach((page, index) => {
    const position = index + 1;
    errors.push(...checkPageIds(id, page, position));
    if (!isPageNumber(page.number)) {
      return;
    }
    errors.push(...checkPageOrder(page.number, seen, previous, position));
    seen.add(page.number);
    previous = Math.max(previous, page.number);
  });
  return errors;
}
