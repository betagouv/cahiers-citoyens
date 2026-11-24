import type { PageError } from "./errors";

interface PageRef {
  page: unknown;
  image: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Lit les pages d'un document pas encore validé : le rapport doit lister les
// erreurs de séquence en même temps que celles du schéma.
function pageRefs(document: unknown): PageRef[] {
  if (!isRecord(document)) {
    return [];
  }
  const pages = document.pages;
  if (!Array.isArray(pages)) {
    return [];
  }
  return pages.map((item: unknown) =>
    isRecord(item)
      ? { page: item.page, image: item.image }
      : { page: undefined, image: undefined },
  );
}

// `page` d'une erreur désigne la position dans la liste, pas le numéro
// déclaré : c'est justement ce numéro qui peut être faux.
export function checkPageSequence(document: unknown): PageError[] {
  const errors: PageError[] = [];
  const firstCitation = new Map<string, number>();
  pageRefs(document).forEach(({ page, image }, index) => {
    const position = index + 1;
    if (typeof page === "number" && page !== position) {
      errors.push({
        page: position,
        code: "page-out-of-sequence",
        message: `La page en position ${position} porte le numéro ${page}, ${position} attendu : les pages vont de 1 à n, dans l'ordre, sans trou ni doublon.`,
      });
    }
    if (typeof image !== "string") {
      return;
    }
    const first = firstCitation.get(image);
    if (first === undefined) {
      firstCitation.set(image, position);
      return;
    }
    errors.push({
      page: position,
      code: "duplicate-image",
      message: `L'image ${image} est déjà citée par la page en position ${first}.`,
    });
  });
  return errors;
}
