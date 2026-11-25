import { join } from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";
import type { Hand, HandFont } from "./page-layout";
import type { Random } from "./random";

const FONTS: readonly HandFont[] = [
  { family: "Caveat", file: "Caveat.ttf", size: 40 },
  { family: "Indie Flower", file: "IndieFlower.ttf", size: 30 },
  { family: "Kalam", file: "Kalam.ttf", size: 29 },
  { family: "Patrick Hand", file: "PatrickHand.ttf", size: 33 },
  {
    family: "Shadows Into Light",
    file: "ShadowsIntoLight.ttf",
    size: 33,
  },
];

const INKS = [
  "#1d3a8f",
  "#22348a",
  "#183070",
  "#2a3f9e",
  "#1f2430",
  "#2b2b33",
  "#1a2a55",
];

export function registerFonts(dir: string): void {
  for (const { family, file } of FONTS) {
    if (!GlobalFonts.registerFromPath(join(dir, file), family)) {
      throw new Error(`police illisible : ${join(dir, file)}`);
    }
  }
}

export function fontCss(hand: Hand): string {
  return `${hand.font.size}px "${hand.font.family}"`;
}

export function newHand(random: Random, previous: HandFont | null): Hand {
  const font = random.pick(FONTS.filter((p) => p !== previous));
  return {
    font,
    ink: random.pick(INKS),
    slant: random.float() * 0.22 - 0.14,
    pressure: 0.82 + random.float() * 0.16,
  };
}
