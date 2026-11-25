import { describe, expect, it } from "vitest";
import { shortNotebook } from "./test-notebook";
import { formatTranscription, header } from "./transcription";

describe("header", () => {
  it("écrit la commune avec sa préposition et le 1er du mois", () => {
    expect(header(shortNotebook())).toEqual([
      "Cahier de doléances et de propositions",
      "Commune du Havre (Seine-Maritime)",
      "Ouvert le 1er janvier 2019",
    ]);
  });

  it("n'ajoute pas « er » aux autres jours", () => {
    expect(header({ ...shortNotebook(), openedOn: "2019-01-12" })[2]).toBe(
      "Ouvert le 12 janvier 2019",
    );
  });
});

describe("formatTranscription", () => {
  it("sépare en-tête et contributions par une ligne vide, signature en dernière ligne", () => {
    expect(formatTranscription(shortNotebook())).toBe(
      [
        "Cahier de doléances et de propositions\nCommune du Havre (Seine-Maritime)\nOuvert le 1er janvier 2019",
        "Moins de taxes sur le carburant pour ceux qui roulent tous les jours.\nM. A.",
        "Un médecin au village.",
      ].join("\n\n") + "\n",
    );
  });
});
