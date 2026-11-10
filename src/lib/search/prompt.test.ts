import { describe, expect, it } from "vitest";
import { buildAnswerMessages } from "./prompt";

describe("buildAnswerMessages", () => {
  const messages = buildAnswerMessages("Il n'y a plus de médecin au village", [
    { notebookId: "notebook-0001", content: "  Le cabinet a fermé.\n" },
    {
      notebookId: "notebook-0007",
      content: "Trois mois pour un dermatologue.",
    },
  ]);

  it("pose les règles dans le message système", () => {
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("uniquement sur les extraits");
    expect(messages[0].content).toContain("[1] ou [2][4]");
    expect(messages[0].content).toContain("Réponds en français");
  });

  it("numérote les extraits de 1 à n, avec leur cahier, puis pose la question", () => {
    expect(messages[1]).toEqual({
      role: "user",
      content:
        "Extraits :\n\n" +
        "[1] (cahier notebook-0001)\nLe cabinet a fermé.\n\n" +
        "[2] (cahier notebook-0007)\nTrois mois pour un dermatologue.\n\n" +
        "Question : Il n'y a plus de médecin au village",
    });
  });
});
