import { toSearchName } from "@/geography/search-name";

// Saisie du champ « Lieu », prête pour la recherche par préfixe.
export interface PlaceInput {
  // Nom normalisé comme `municipalities.search_name` (`toSearchName`).
  searchName: string;
  // Département lu dans une étiquette « Charolles (71) » : seules ses communes
  // sont proposées.
  labelDepartmentCode: string | undefined;
  // Saisie de la forme d'un code de département (« 71 », « 2a », « 971 ») :
  // ses communes sont proposées après lui.
  typedDepartmentCode: string | undefined;
  // Codes postaux qui commencent par une saisie de 4 ou 5 chiffres.
  postalCodes: readonly string[];
}

export const MIN_PLACE_INPUT_LENGTH = 2;

const LABEL = /^(.*?)\s*\((\d{2,3}|2[ab])\)\s*$/i;
const DEPARTMENT_CODE = /^(\d{2,3}|2[ab])$/;
const POSTAL_CODE_PREFIX = /^\d{4,5}$/;

// Les codes postaux à 5 chiffres qui commencent par `digits` (4 ou 5
// chiffres) : 10 au plus. L'index GIN de `postal_codes` ne cherche pas par
// préfixe dans un tableau, mais il teste vite un recouvrement avec cette liste.
// Avant 4 chiffres, la liste serait trop longue : la saisie vaut alors code de
// département.
export function postalCodesStartingWith(digits: string): string[] {
  if (digits.length === 5) return [digits];
  return Array.from({ length: 10 }, (_, last) => `${digits}${last}`);
}

export function parsePlaceInput(value: string): PlaceInput | undefined {
  const label = LABEL.exec(value);
  const searchName = toSearchName(label === null ? value : label[1]);
  if (searchName.length < MIN_PLACE_INPUT_LENGTH) return undefined;
  return {
    searchName,
    labelDepartmentCode: label === null ? undefined : label[2].toUpperCase(),
    typedDepartmentCode: DEPARTMENT_CODE.test(searchName)
      ? searchName.toUpperCase()
      : undefined,
    postalCodes: POSTAL_CODE_PREFIX.test(searchName)
      ? postalCodesStartingWith(searchName)
      : [],
  };
}
