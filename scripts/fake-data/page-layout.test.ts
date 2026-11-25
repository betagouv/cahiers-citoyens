import { describe, expect, it } from "vitest";
import {
  type Hand,
  insertBlankPages,
  type Line,
  splitPages,
} from "./page-layout";
import { createRandom } from "./random";

const HAND: Hand = {
  font: { family: "Caveat", file: "Caveat.ttf", size: 40 },
  ink: "#000",
  slant: 0,
  pressure: 1,
};

function text(words: string): Line {
  return {
    kind: "text",
    words: words.split(" "),
    hand: HAND,
    align: "left",
    role: "body",
  };
}

describe("splitPages", () => {
  it("coupe le flux en pages, sans ligne vide ni trait en fin de page", () => {
    const flow: Line[] = [
      text("a"),
      { kind: "blank" },
      text("b"),
      { kind: "rule", hand: HAND },
      { kind: "blank" },
      { kind: "blank" },
      text("c"),
    ];
    expect(splitPages(flow, 2)).toEqual([
      [text("a")],
      [text("b")],
      [text("c")],
    ]);
  });
});

describe("insertBlankPages", () => {
  it("insère des pages vides après des pages écrites, sans en perdre", () => {
    const pages: Line[][] = Array.from({ length: 40 }, (_, i) => [
      text(`page ${i}`),
    ]);
    const withBlanks = insertBlankPages(pages, createRandom("blancs"));
    expect(withBlanks.filter((page) => page.length > 0)).toEqual(pages);
    expect(withBlanks.length).toBeGreaterThan(pages.length);
    expect(withBlanks[0]).toEqual(pages[0]);
    withBlanks.forEach((page, i) => {
      if (page.length === 0)
        expect(withBlanks[i - 1].length).toBeGreaterThan(0);
    });
  });
});
