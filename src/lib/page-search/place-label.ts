// Une proposition du champ « Lieu », telle que la renvoie
// `/api/suggestions/places` et que l'affiche la liste.
export interface PlaceSuggestion {
  kind: "department" | "municipality";
  // Code du département, ou code INSEE actuel de la commune.
  code: string;
  name: string;
  departmentCode: string;
  // Vide pour les collectivités d'outre-mer, absentes de `departments`.
  departmentName: string | null;
  pageCount: number;
}

// « Charente (16) », « Charolles (71) » : le texte du champ une fois le lieu
// choisi, et le lieu affiché sur la page de résultats.
export function placeLabel(
  place: Pick<PlaceSuggestion, "name" | "departmentCode">,
): string {
  return `${place.name} (${place.departmentCode})`;
}

// Seconde ligne d'une proposition : « Département » ou
// « Commune · Saône-et-Loire (71) ».
export function placeDescription(place: PlaceSuggestion): string {
  if (place.kind === "department") return "Département";
  if (place.departmentName === null) return "Commune";
  return `Commune · ${place.departmentName} (${place.departmentCode})`;
}

// Le lieu choisi dans le formulaire : `code` part dans `?place=`, `label`
// reste affiché dans le champ, `pageCount` donne le bouton sans requête.
export interface SelectedPlace {
  code: string;
  label: string;
  pageCount: number;
}

export function selectedPlace(suggestion: PlaceSuggestion): SelectedPlace {
  return {
    code: suggestion.code,
    label: placeLabel(suggestion),
    pageCount: suggestion.pageCount,
  };
}
