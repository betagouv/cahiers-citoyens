import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { createGrain, digitize } from "./digitize";
import type { Notebook } from "./domain";
import { fontCss } from "./hands";
import type { Polygon } from "../../src/ingestion/notebook";
import { linePolygon } from "./line-polygon";
import {
  type Hand,
  insertBlankPages,
  type Line,
  type LineRole,
} from "./page-layout";
import {
  FIRST_LINE,
  HEIGHT,
  LINE_SPACING,
  TEXT_END,
  TEXT_START,
  WIDTH,
} from "./page-geometry";
import { paginate } from "./paginate";
import { drawPaper, type Ruling } from "./paper";
import { createRandom, type Random } from "./random";

export interface WrittenLine {
  text: string;
  role: LineRole;
  polygon: Polygon;
}

function drawRule(ctx: SKRSContext2D, hand: Hand, y: number, random: Random) {
  const start = TEXT_START + 120 + random.float() * 200;
  const end = TEXT_END - 120 - random.float() * 200;
  ctx.globalAlpha = hand.pressure;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start, y - 10);
  ctx.bezierCurveTo(
    start + 150,
    y - 14 + random.float() * 8,
    end - 150,
    y - 6 - random.float() * 8,
    end,
    y - 11,
  );
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Rend la ligne transcrite, ou null pour une ligne sans texte.
function drawLine(
  ctx: SKRSContext2D,
  line: Line,
  y: number,
  random: Random,
): WrittenLine | null {
  if (line.kind === "blank") return null;
  const hand = line.hand;
  ctx.strokeStyle = hand.ink;
  ctx.fillStyle = hand.ink;
  if (line.kind === "rule") {
    drawRule(ctx, hand, y, random);
    return null;
  }

  ctx.font = fontCss(hand);
  const space = ctx.measureText(" ").width;
  const widths = line.words.map((word) => ctx.measureText(word).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + space * (line.words.length - 1);
  let x =
    line.align === "left"
      ? TEXT_START + random.float() * 6
      : line.align === "right"
        ? TEXT_END - total - 30
        : (TEXT_START + TEXT_END - total) / 2;
  const start = x;
  const drift = random.float() * 6 - 3;
  line.words.forEach((word, i) => {
    const dy =
      drift * ((x - TEXT_START) / (TEXT_END - TEXT_START)) +
      random.float() * 2.4 -
      1.2;
    ctx.save();
    ctx.translate(x, y - 2 + dy);
    ctx.transform(1, 0, hand.slant, 1, 0, 0);
    ctx.rotate((random.float() - 0.5) * 0.025);
    ctx.globalAlpha = hand.pressure + random.float() * 0.06;
    ctx.fillText(word, 0, 0);
    ctx.restore();
    x += widths[i] + space * (0.85 + random.float() * 0.4);
  });
  return {
    text: line.words.join(" "),
    role: line.role,
    polygon: linePolygon(start, start + total, y),
  };
}

export interface ScanPage {
  canvas: Canvas;
  lines: WrittenLine[];
}

// Sans `blankPages`, le tirage aléatoire est celui de renderScan : mêmes pages, mêmes octets.
export async function* renderPages(
  notebook: Notebook,
  seed: string,
  blankPages: Random | null = null,
): AsyncGenerator<ScanPage> {
  const random = createRandom(seed);
  const grain = createGrain(random.child("grain"));
  const paper = createCanvas(WIDTH, HEIGHT);
  const ctx = paper.getContext("2d");
  const ruling: Ruling = random.chance(0.7) ? "seyes" : "plain";
  const tint: [number, number, number] = [
    random.int(240, 250),
    random.int(234, 244),
    random.int(214, 230),
  ];

  const pages = paginate(notebook, ctx, random);
  for (const page of blankPages === null
    ? pages
    : insertBlankPages(pages, blankPages)) {
    drawPaper(ctx, ruling, tint, random);
    const lines = page
      .map((line, i) =>
        drawLine(ctx, line, FIRST_LINE + i * LINE_SPACING, random),
      )
      .filter((line) => line !== null);
    yield { canvas: digitize(paper, grain, random), lines };
  }
}
