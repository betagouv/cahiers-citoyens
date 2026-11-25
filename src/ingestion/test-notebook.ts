import type { RawLine, RawLineKind, RawNotebook } from "./condorcet-notebook";
import type { Point } from "./notebook";

export const EXAMPLE_ID = "CC_01500_190318_01004_MD_16116";

function line(
  id: string,
  kind: RawLineKind,
  zone: string,
  text: string,
  ring: Point[],
): RawLine {
  return {
    id_ligne: id,
    type_ligne: kind,
    type_zone: zone,
    transcription: text,
    polygone: { type: "Polygon", coordinates: [ring] },
  };
}

// L'exemple de la section 3 du protocole, avec une ligne manuscrite en plus.
// Données fictives.
export function exampleNotebook(): RawNotebook {
  return {
    schema_version: "Campus Condorcet",
    id_cahier: EXAMPLE_ID,
    metadonnees: {
      departement: "Ain",
      numero_departement: "01",
      commune: "Exempleville",
      code_insee: "01004",
      code_postal: "01500",
      type_transcription_dactylographiee: "automatique",
      type_transcription_manuscrite: "manuelle",
    },
    pages: [
      {
        numero_page: 1,
        id_page: `${EXAMPLE_ID}_1`,
        largeur: 2484,
        hauteur: 3507,
        lignes: [
          line(
            `${EXAMPLE_ID}_1_1`,
            "dactylographiee",
            "non renseigné",
            "Cahier de doléances",
            [
              [239, 282],
              [904, 282],
              [904, 353],
              [239, 353],
              [239, 282],
            ],
          ),
          line(
            `${EXAMPLE_ID}_1_2`,
            "manuscrite",
            "Corps de la contribution",
            "Plus de trains le dimanche.",
            [
              [251, 410],
              [1630, 404],
              [1632, 489],
              [253, 495],
              [251, 410],
            ],
          ),
        ],
      },
      {
        numero_page: 3,
        id_page: `${EXAMPLE_ID}_3`,
        largeur: 2484,
        hauteur: 3507,
        lignes: [],
      },
    ],
  };
}
