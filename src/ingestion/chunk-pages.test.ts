import { describe, expect, it } from "vitest";
import { chunkPages, pageText } from "./chunk-pages";
import { MAX_WORDS } from "./chunk-text";
import type { Line, LineKind, Page } from "./notebook";

const BODY = "Corps de la contribution";

function line(
  text: string,
  kind: LineKind = "handwritten",
  zone: string | null = BODY,
): Line {
  return {
    id: text,
    kind,
    zone,
    text,
    polygon: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  };
}

function page(number: number, lines: Line[]): Page {
  return { number, id: `p${number}`, width: 10, height: 10, lines };
}

const header = line("Cahier de doléances", "typed", null);
function signature(name: string): Line {
  return line(name, "handwritten", "Signature");
}

describe("pageText", () => {
  it("réunit les lignes dans l'ordre, une par ligne", () => {
    expect(pageText(page(1, [header, line("Plus de trains")]))).toBe(
      "Cahier de doléances\nPlus de trains",
    );
  });

  it("vaut une chaîne vide pour une page sans ligne", () => {
    expect(pageText(page(2, []))).toBe("");
  });
});

describe("chunkPages", () => {
  it("sépare l'en-tête, puis chaque contribution avec sa signature", () => {
    const chunks = chunkPages([
      page(1, [
        header,
        line("Plus de trains"),
        line("le dimanche."),
        signature("Jeanne"),
        line("Moins de taxes."),
        signature("Paul"),
      ]),
    ]);

    expect(chunks).toEqual([
      { page: 1, content: "Cahier de doléances" },
      { page: 1, content: "Plus de trains le dimanche. Jeanne" },
      { page: 1, content: "Moins de taxes. Paul" },
    ]);
  });

  it("coupe une contribution à chaque page et ignore les lignes vides", () => {
    const chunks = chunkPages([
      page(1, [line("Rouvrir la poste")]),
      page(2, []),
      page(4, [line("  "), line(" du village. ")]),
      page(5, [line("")]),
    ]);

    expect(chunks).toEqual([
      { page: 1, content: "Rouvrir la poste" },
      { page: 4, content: "du village." },
    ]);
  });

  it("garde dans la contribution une zone vue pour la première fois", () => {
    const chunks = chunkPages([
      page(1, [
        line("Texte."),
        signature("Jeanne"),
        line("Annexe", "handwritten", null),
      ]),
    ]);

    expect(chunks).toEqual([{ page: 1, content: "Texte. Jeanne Annexe" }]);
  });

  it("coupe entre deux phrases une contribution trop longue", () => {
    const long = `${Array.from({ length: MAX_WORDS }, () => "mot").join(" ")}.`;
    const chunks = chunkPages([page(3, [line(long), line("Fin.")])]);

    expect(chunks).toEqual([
      { page: 3, content: long },
      { page: 3, content: "Fin." },
    ]);
  });
});
