import { describe, expect, it } from "vitest";
import { MAX_WORDS, MIN_WORDS, chunkTranscription } from "./chunk";

const HEADER =
  "Cahier de doléances et de propositions\nCommune de Exemple (00)\nOuvert le 1er janvier 2019";

function sentence(words: number, word: string): string {
  return `${Array.from({ length: words }, () => word).join(" ")}.`;
}

function transcription(...contributions: string[]): string {
  return `${[HEADER, ...contributions].join("\n\n")}\n`;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe("chunkTranscription", () => {
  it("exclut l'en-tête", () => {
    const chunks = chunkTranscription(transcription(sentence(150, "a")));
    expect(chunks).toEqual([sentence(150, "a")]);
    expect(chunks.join(" ")).not.toContain("doléances");
  });

  it("regroupe les contributions sans dépasser MAX_WORDS", () => {
    const contributions = [
      sentence(150, "a"),
      sentence(150, "b"),
      sentence(150, "c"),
      sentence(150, "d"),
    ];
    const chunks = chunkTranscription(transcription(...contributions));
    expect(chunks).toEqual([
      `${contributions[0]}\n\n${contributions[1]}`,
      `${contributions[2]}\n\n${contributions[3]}`,
    ]);
  });

  it("coupe une contribution trop longue entre deux sentences", () => {
    const sentences = Array.from({ length: 9 }, (_, i) =>
      sentence(99, `m${i}`),
    );
    const chunks = chunkTranscription(transcription(sentences.join(" ")));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(countWords(chunk)).toBeLessThanOrEqual(MAX_WORDS);
      expect(chunk).toMatch(/\.$/);
    }
    expect(chunks.join(" ")).toBe(sentences.join(" "));
  });

  it("ne laisse pas un petit dernier groupe quand une autre coupure respecte les bornes", () => {
    const chunks = chunkTranscription(
      transcription(
        sentence(150, "a"),
        sentence(150, "b"),
        sentence(90, "c"),
        sentence(30, "d"),
      ),
    );
    expect(chunks.map(countWords)).toEqual([150, 270]);
    for (const chunk of chunks) {
      expect(countWords(chunk)).toBeGreaterThanOrEqual(MIN_WORDS);
      expect(countWords(chunk)).toBeLessThanOrEqual(MAX_WORDS);
    }
  });
});
