import { describe, expect, it } from "vitest";
import { MAX_WORDS, splitContribution } from "./chunk-text";

function sentence(words: number, word: string): string {
  return `${Array.from({ length: words }, () => word).join(" ")}.`;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe("splitContribution", () => {
  it("garde entière une contribution courte", () => {
    expect(splitContribution(sentence(150, "a"))).toEqual([sentence(150, "a")]);
  });

  it("coupe une contribution trop longue entre deux phrases", () => {
    const sentences = Array.from({ length: 9 }, (_, i) =>
      sentence(99, `m${i}`),
    );
    const chunks = splitContribution(sentences.join(" "));
    expect(chunks.map(countWords)).toEqual([396, 396, 99]);
    for (const chunk of chunks) {
      expect(countWords(chunk)).toBeLessThanOrEqual(MAX_WORDS);
      expect(chunk).toMatch(/\.$/);
    }
    expect(chunks.join(" ")).toBe(sentences.join(" "));
  });

  it("ne coupe pas une contribution d'exactement MAX_WORDS mots", () => {
    const contribution = sentence(MAX_WORDS, "a");
    expect(splitContribution(contribution)).toEqual([contribution]);
  });

  it("garde entière une phrase seule plus longue que MAX_WORDS", () => {
    const contribution = sentence(MAX_WORDS + 10, "a");
    expect(splitContribution(contribution)).toEqual([contribution]);
  });
});
