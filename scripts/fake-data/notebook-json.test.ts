import { describe, expect, it } from "vitest";
import {
  buildNotebookJson,
  imageName,
  type NotebookContent,
  pageId,
  renumberPage,
  SCHEMA_VERSION,
  serializeJson,
} from "./notebook-json";
import { notebookMetadata } from "./notebook-metadata";
import type { WrittenLine } from "./scan";
import { shortNotebook } from "./test-notebook";

const RING: [number, number][] = [
  [10, 20],
  [110, 20],
  [110, 60],
  [10, 60],
  [10, 20],
];

function line(text: string, role: WrittenLine["role"]): WrittenLine {
  return { text, role, polygon: [RING] };
}

const CONTENT: NotebookContent = {
  id: "CC_X",
  metadata: notebookMetadata(shortNotebook().municipality, "76600"),
  pages: [
    {
      number: 1,
      lines: [line("Cahier", "header"), line("Un médecin.", "body")],
      image: { bytes: new Uint8Array([1]), extension: "png" },
    },
    {
      number: 4,
      lines: [line("M. A.", "signature")],
      image: { bytes: new Uint8Array([2]), extension: "png" },
    },
  ],
};

describe("pageId et imageName", () => {
  it("dérivent de l'identifiant du cahier et du numéro de page", () => {
    expect(pageId("CC_X", 4)).toBe("CC_X_4");
    expect(imageName("CC_X", 4, "jpg")).toBe("CC_X_4.jpg");
  });
});

describe("buildNotebookJson", () => {
  it("suit le format Condorcet, une entrée par page, une par ligne", () => {
    expect(buildNotebookJson(CONTENT)).toEqual({
      schema_version: SCHEMA_VERSION,
      id_cahier: "CC_X",
      metadonnees: CONTENT.metadata,
      pages: [
        {
          numero_page: 1,
          id_page: "CC_X_1",
          largeur: 1240,
          hauteur: 1754,
          lignes: [
            {
              id_ligne: "CC_X_1_1",
              type_ligne: "dactylographiee",
              type_zone: "non renseigné",
              transcription: "Cahier",
              polygone: { type: "Polygon", coordinates: [RING] },
            },
            {
              id_ligne: "CC_X_1_2",
              type_ligne: "manuscrite",
              type_zone: "Corps de la contribution",
              transcription: "Un médecin.",
              polygone: { type: "Polygon", coordinates: [RING] },
            },
          ],
        },
        {
          numero_page: 4,
          id_page: "CC_X_4",
          largeur: 1240,
          hauteur: 1754,
          lignes: [
            {
              id_ligne: "CC_X_4_1",
              type_ligne: "manuscrite",
              type_zone: "Signature",
              transcription: "M. A.",
              polygone: { type: "Polygon", coordinates: [RING] },
            },
          ],
        },
      ],
    });
  });
});

describe("renumberPage", () => {
  it("renumérote la page et les identifiants de ses lignes", () => {
    const [first] = buildNotebookJson(CONTENT).pages;
    const moved = renumberPage(first, "CC_X", 9);
    expect(moved.numero_page).toBe(9);
    expect(moved.id_page).toBe("CC_X_9");
    expect(moved.lignes.map(({ id_ligne }) => id_ligne)).toEqual([
      "CC_X_9_1",
      "CC_X_9_2",
    ]);
    expect(moved.lignes[1].transcription).toBe("Un médecin.");
  });
});

describe("serializeJson", () => {
  it("écrit du JSON UTF-8 indenté, terminé par un saut de ligne", () => {
    const bytes = serializeJson({ text: "Délibération" });
    expect(new TextDecoder().decode(bytes)).toBe(
      '{\n  "text": "Délibération"\n}\n',
    );
  });
});
