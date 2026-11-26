// Une proposition du champ « Lieu », telle que la renvoie
// `/api/suggestions/places` et que l'affiche la liste.
interface PlaceSuggestionBase {
  // Code du département, code INSEE actuel de la commune, ou code INSEE de
  // 2019 d'une commune fusionnée depuis.
  code: string;
  name: string;
  departmentCode: string;
  // Vide pour les collectivités d'outre-mer, absentes de `departments`.
  departmentName: string | null;
  pageCount: number;
}

export interface CurrentPlaceSuggestion extends PlaceSuggestionBase {
  kind: "department" | "municipality";
}

// Commune de 2019 fusionnée depuis, sous son nom et son département de 2019 :
// ses pages sont celles des cahiers qui portent son ancien code.
export interface FormerMunicipalitySuggestion extends PlaceSuggestionBase {
  kind: "formerMunicipality";
  // Nom de la commune actuelle qui l'a absorbée.
  currentName: string;
}

export type PlaceSuggestion =
  CurrentPlaceSuggestion | FormerMunicipalitySuggestion;

// « Charente (16) », « Charolles (71) », « Béon (01) » : le texte du champ une
// fois le lieu choisi, que la page de résultats reconnaît sans JavaScript.
export function placeLabel(
  place: Pick<PlaceSuggestion, "name" | "departmentCode">,
): string {
  return `${place.name} (${place.departmentCode})`;
}

// Le lieu dans les titres de la page de résultats : son étiquette, ou
// « Béon (ancienne commune, aujourd’hui Culoz-Béon) ».
export function formerMunicipalityName(
  place: Pick<FormerMunicipalitySuggestion, "name" | "currentName">,
): string {
  return `${place.name} (ancienne commune, aujourd’hui ${place.currentName})`;
}

export function placeDisplayName(place: PlaceSuggestion): string {
  return place.kind === "formerMunicipality"
    ? formerMunicipalityName(place)
    : placeLabel(place);
}

function departmentMention(place: PlaceSuggestion): string[] {
  return place.departmentName === null
    ? []
    : [`${place.departmentName} (${place.departmentCode})`];
}

// Seconde ligne d'une proposition : « Département »,
// « Commune · Saône-et-Loire (71) » ou
// « Ancienne commune · Ain (01) · aujourd’hui Culoz-Béon ».
export function placeDescription(place: PlaceSuggestion): string {
  switch (place.kind) {
    case "department":
      return "Département";
    case "municipality":
      return ["Commune", ...departmentMention(place)].join(" · ");
    case "formerMunicipality":
      return [
        "Ancienne commune",
        ...departmentMention(place),
        `aujourd’hui ${place.currentName}`,
      ].join(" · ");
  }
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
