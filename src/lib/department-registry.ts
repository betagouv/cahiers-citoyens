// Données de publication seules, sans logique : les tests peuvent les remplacer.

// Une étiquette de la page d'accueil : « Outre-mer » regroupe plusieurs codes.
export interface PublishedArea {
  label: string;
  codes: readonly string[];
}

export const PUBLISHED_AREAS: readonly PublishedArea[] = [
  { label: "Alpes-de-Haute-Provence", codes: ["04"] },
  { label: "Creuse", codes: ["23"] },
  { label: "Doubs", codes: ["25"] },
  { label: "Gironde", codes: ["33"] },
  { label: "Manche", codes: ["50"] },
  { label: "Outre-mer", codes: ["971", "972", "973", "974", "976"] },
  { label: "Seine-Saint-Denis", codes: ["93"] },
  { label: "Somme", codes: ["80"] },
];

export const ABSENT_DEPARTMENT_CODES: readonly string[] = [];
