import { describe, expect, it } from "vitest";
import { MAX_QUESTION_LENGTH, parseQuestion } from "./search";

describe("parseQuestion", () => {
  it("normalise les espaces", () => {
    expect(parseQuestion("  plus de   médecin\n au village ")).toBe(
      "plus de médecin au village",
    );
    expect(parseQuestion(["a", "b"])).toBe("a");
  });

  it("renvoie une chaîne vide sans question", () => {
    expect(parseQuestion(undefined)).toBe("");
    expect(parseQuestion("   ")).toBe("");
  });

  it("borne la longueur", () => {
    expect(parseQuestion("x".repeat(2000))).toHaveLength(MAX_QUESTION_LENGTH);
  });
});
