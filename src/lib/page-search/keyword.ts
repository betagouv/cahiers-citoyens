export const MAX_KEYWORD_LENGTH = 100;

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

// Le mot-clé saisi (`?q=`), espaces normalisés et longueur bornée. Sans lettre
// ni chiffre, il ne contient aucun mot pour Postgres : il vaut alors chaîne
// vide, et aucune requête plein texte ne part avec une recherche vide.
export function parseKeyword(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return "";
  const keyword = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_KEYWORD_LENGTH);
  return WORD_CHARACTER.test(keyword) ? keyword : "";
}
