import { describe, expect, it } from "vitest";
import { splitCitations } from "./citations";

describe("splitCitations", () => {
  it("sépare le texte et les renvois", () => {
    expect(
      splitCitations("Des habitants manquent de médecins [1][3].", 5),
    ).toEqual([
      { kind: "text", text: "Des habitants manquent de médecins " },
      { kind: "citation", number: 1 },
      { kind: "citation", number: 3 },
      { kind: "text", text: "." },
    ]);
  });

  it("reconnaît une liste dans un seul crochet", () => {
    expect(splitCitations("Voir [2, 4]", 5)).toEqual([
      { kind: "text", text: "Voir " },
      { kind: "citation", number: 2 },
      { kind: "citation", number: 4 },
    ]);
  });

  it("laisse en texte un numéro sans source", () => {
    expect(splitCitations("Selon [6] et [0].", 5)).toEqual([
      { kind: "text", text: "Selon [6] et [0]." },
    ]);
  });

  it("renvoie le texte seul sans renvoi", () => {
    expect(splitCitations("Aucun extrait ne répond.", 5)).toEqual([
      { kind: "text", text: "Aucun extrait ne répond." },
    ]);
  });
});
