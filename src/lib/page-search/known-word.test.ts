import { expect, it } from "vitest";
import { isKnownWord } from "./known-word";

const suggestions = [
  { word: "retraite", pageCount: 7 },
  { word: "retraités", pageCount: 2 },
];

it("reconnaît un mot choisi ou exactement proposé", () => {
  expect(isKnownWord("retraité ", "retraité", undefined)).toBe(true);
  expect(isKnownWord("Retraite", null, suggestions)).toBe(true);
});

it("refuse un début de mot, un mot vide ou des suggestions inconnues", () => {
  expect(isKnownWord("retr", null, suggestions)).toBe(false);
  expect(isKnownWord("  ", "retraite", suggestions)).toBe(false);
  expect(isKnownWord("retraite", "retraités", undefined)).toBe(false);
});
