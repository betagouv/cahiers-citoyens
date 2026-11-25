const LIGATURES: Record<string, string> = { œ: "oe", æ: "ae" };

// Forme de recherche d'un nom de lieu : minuscules, sans accents, chaque suite
// de tirets, apostrophes ou espaces réduite à une espace. « L'Haÿ-les-Roses »
// devient « l hay les roses ». Le même calcul s'applique au nom stocké et à la
// saisie, pour une recherche par préfixe.
export function toSearchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[œæ]/g, (ligature) => LIGATURES[ligature])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
