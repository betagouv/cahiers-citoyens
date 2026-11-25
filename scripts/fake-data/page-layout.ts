import type { Random } from "./random";

export interface HandFont {
  family: string;
  file: string;
  size: number;
}

export interface Hand {
  font: HandFont;
  ink: string;
  slant: number;
  pressure: number;
}

// En-tête de la mairie, corps d'une contribution, signature.
export type LineRole = "header" | "body" | "signature";

export type Line =
  | {
      kind: "text";
      words: string[];
      hand: Hand;
      align: "left" | "right" | "center";
      role: LineRole;
    }
  | { kind: "rule"; hand: Hand }
  | { kind: "blank" };

export function insertBlankPages(pages: Line[][], random: Random): Line[][] {
  const withBlanks: Line[][] = [];
  for (const page of pages) {
    withBlanks.push(page);
    if (random.chance(0.15)) withBlanks.push([]);
  }
  return withBlanks;
}

// Une page ne finit jamais sur une ligne vide ou un trait ; une page sans texte disparaît.
export function splitPages(
  flow: readonly Line[],
  linesPerPage: number,
): Line[][] {
  const pages: Line[][] = [];
  for (let i = 0; i < flow.length; i += linesPerPage) {
    const page = flow.slice(i, i + linesPerPage);
    while (page.length > 0 && page[page.length - 1].kind !== "text") page.pop();
    if (page.length > 0) pages.push(page);
  }
  return pages;
}
