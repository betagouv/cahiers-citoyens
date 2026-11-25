import type { NotebookSpec } from "./delivery-plan";
import type { Notebook } from "./domain";
import type { NotebookContent } from "./notebook-json";
import { notebookMetadata } from "./notebook-metadata";
import type { WrittenLine } from "./scan";

export function shortNotebook(): Notebook {
  return {
    id: "notebook-0001",
    municipality: {
      name: "Le Havre",
      inseeCode: "76351",
      department: "Seine-Maritime",
      region: "Normandie",
    },
    openedOn: "2019-01-01",
    contributions: [
      {
        position: 1,
        theme: "taxes",
        text: "Moins de taxes sur le carburant pour ceux qui roulent tous les jours.",
        signature: "M. A.",
      },
      {
        position: 2,
        theme: "health",
        text: "Un médecin au village.",
        signature: null,
      },
    ],
  };
}

// Cahier d'un dépôt, sans modification ni défaut, au format des dépôts réels.
export function testSpec(overrides: Partial<NotebookSpec> = {}): NotebookSpec {
  const notebook = shortNotebook();
  return {
    index: 1,
    id: "CC_76600_190101_76351_MD_10001",
    notebook,
    metadata: notebookMetadata(notebook.municipality, "76600"),
    imageStyle: "jpeg-named-png",
    gaps: false,
    change: "none",
    defects: [],
    ...overrides,
  };
}

function bodyLines(...texts: string[]): WrittenLine[] {
  return texts.map((text) => ({
    text,
    role: "body",
    polygon: [
      [
        [0, 0],
        [9, 0],
        [9, 9],
        [0, 0],
      ],
    ],
  }));
}

// Contenu rendu d'un cahier de trois pages, numérotées 1, 2 et 5.
export function testContent(): NotebookContent {
  return {
    id: "CC_1",
    metadata: notebookMetadata(shortNotebook().municipality, "76600"),
    pages: [
      {
        number: 1,
        lines: bodyLines("a", "b"),
        image: { bytes: new Uint8Array([10, 11, 12, 13]), extension: "png" },
      },
      {
        number: 2,
        lines: [],
        image: { bytes: new Uint8Array([15]), extension: "png" },
      },
      {
        number: 5,
        lines: bodyLines("c"),
        image: { bytes: new Uint8Array([20, 21]), extension: "png" },
      },
    ],
  };
}
