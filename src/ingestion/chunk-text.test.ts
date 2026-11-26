import { describe, expect, it } from "vitest";
import { MAX_WORDS, chunkTranscription } from "./chunk-text";

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

  it("fait un chunk par contribution, même courte, sans regrouper", () => {
    const contributions = [
      sentence(150, "a"),
      sentence(12, "b"),
      `${sentence(30, "c")}\nSignature`,
    ];
    expect(chunkTranscription(transcription(...contributions))).toEqual(
      contributions,
    );
  });

  it("ignore les espaces autour des contributions et les lignes vides en trop", () => {
    expect(
      chunkTranscription(
        `${HEADER}\n\n  ${sentence(5, "a")}  \n\n\n\n${sentence(3, "b")}\n`,
      ),
    ).toEqual([sentence(5, "a"), sentence(3, "b")]);
  });

  it("coupe une contribution trop longue entre deux phrases", () => {
    const sentences = Array.from({ length: 9 }, (_, i) =>
      sentence(99, `m${i}`),
    );
    const chunks = chunkTranscription(transcription(sentences.join(" ")));
    expect(chunks.map(countWords)).toEqual([396, 396, 99]);
    for (const chunk of chunks) {
      expect(countWords(chunk)).toBeLessThanOrEqual(MAX_WORDS);
      expect(chunk).toMatch(/\.$/);
    }
    expect(chunks.join(" ")).toBe(sentences.join(" "));
  });

  it("ne coupe pas une contribution d'exactement MAX_WORDS mots", () => {
    const contribution = sentence(MAX_WORDS, "a");
    expect(chunkTranscription(transcription(contribution))).toEqual([
      contribution,
    ]);
  });

  it("ne renvoie rien pour un cahier sans contribution", () => {
    expect(chunkTranscription(`${HEADER}\n`)).toEqual([]);
  });
});
