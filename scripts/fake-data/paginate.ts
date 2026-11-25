import type { SKRSContext2D } from "@napi-rs/canvas";
import type { Notebook } from "./domain";
import { fontCss, newHand } from "./hands";
import { type Hand, type HandFont, type Line, splitPages } from "./page-layout";
import { LINES_PER_PAGE, TEXT_END, TEXT_START } from "./page-geometry";
import type { Random } from "./random";
import { header } from "./transcription";

export function wrapLines(
  ctx: SKRSContext2D,
  text: string,
  hand: Hand,
  width: number,
): string[][] {
  ctx.font = fontCss(hand);
  const lines: string[][] = [];
  let current: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const attempt = [...current, word].join(" ");
    if (current.length > 0 && ctx.measureText(attempt).width > width) {
      lines.push(current);
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

export function paginate(
  notebook: Notebook,
  ctx: SKRSContext2D,
  random: Random,
): Line[][] {
  const flow: Line[] = [];
  const townHall = newHand(random, null);
  for (const [i, line] of header(notebook).entries()) {
    flow.push({
      kind: "text",
      words: line.split(" "),
      hand: townHall,
      align: i === 0 ? "center" : "left",
      role: "header",
    });
  }
  flow.push({ kind: "blank" });

  let previous: HandFont | null = townHall.font;
  for (const contribution of notebook.contributions) {
    const hand = newHand(random, previous);
    previous = hand.font;
    const indent = random.int(0, 2) * 20;
    for (const words of wrapLines(
      ctx,
      contribution.text,
      hand,
      TEXT_END - TEXT_START - indent,
    )) {
      flow.push({ kind: "text", words, hand, align: "left", role: "body" });
    }
    if (contribution.signature !== null) {
      flow.push({
        kind: "text",
        words: contribution.signature.split(" "),
        hand,
        align: "right",
        role: "signature",
      });
    }
    flow.push(random.chance(0.5) ? { kind: "rule", hand } : { kind: "blank" });
  }

  return splitPages(flow, LINES_PER_PAGE);
}
