import { join } from "node:path";
import {
  type Canvas,
  createCanvas,
  GlobalFonts,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import type { Notebook } from "./domain";
import { createRandom, type Random } from "./random";
import { header } from "./transcription";

// A4 à 150 ppp : assez pour lire l'écriture, assez léger pour 200 cahiers.
const WIDTH = 1240;
const HEIGHT = 1754;
const PX_PER_MM = WIDTH / 210;
const LINE_SPACING = 8 * PX_PER_MM;
const LEFT_MARGIN = Math.round(34 * PX_PER_MM);
const FIRST_LINE = 3 * LINE_SPACING;
const LINES_PER_PAGE =
  Math.floor((HEIGHT - FIRST_LINE - 1.5 * LINE_SPACING) / LINE_SPACING) + 1;
const TEXT_START = LEFT_MARGIN + 18;
const TEXT_END = WIDTH - 60;
const JPEG_QUALITY = 65;
const A4_POINTS: [number, number] = [595.28, 841.89];

interface HandFont {
  family: string;
  file: string;
  size: number;
}

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

type Ruling = "seyes" | "plain";

interface Hand {
  font: HandFont;
  ink: string;
  slant: number;
  pressure: number;
}

type Line =
  | {
      kind: "text";
      words: string[];
      hand: Hand;
      align: "left" | "right" | "center";
    }
  | { kind: "rule"; hand: Hand }
  | { kind: "blank" };

export function registerFonts(dir: string): void {
  for (const { family, file } of FONTS) {
    if (!GlobalFonts.registerFromPath(join(dir, file), family)) {
      throw new Error(`police illisible : ${join(dir, file)}`);
    }
  }
}

function fontCss(hand: Hand): string {
  return `${hand.font.size}px "${hand.font.family}"`;
}

function wrapLines(
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

function newHand(random: Random, previous: HandFont | null): Hand {
  const font = random.pick(FONTS.filter((p) => p !== previous));
  return {
    font,
    ink: random.pick(INKS),
    slant: random.float() * 0.22 - 0.14,
    pressure: 0.82 + random.float() * 0.16,
  };
}

function paginate(
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
      flow.push({ kind: "text", words, hand, align: "left" });
    }
    if (contribution.signature !== null) {
      flow.push({
        kind: "text",
        words: contribution.signature.split(" "),
        hand,
        align: "right",
      });
    }
    flow.push(random.chance(0.5) ? { kind: "rule", hand } : { kind: "blank" });
  }

  const pages: Line[][] = [];
  for (let i = 0; i < flow.length; i += LINES_PER_PAGE) {
    const page = flow.slice(i, i + LINES_PER_PAGE);
    while (page.length > 0 && page[page.length - 1].kind !== "text") page.pop();
    if (page.length > 0) pages.push(page);
  }
  return pages;
}

function drawPaper(
  ctx: SKRSContext2D,
  ruling: Ruling,
  tint: [number, number, number],
  random: Random,
) {
  const [r, g, b] = tint;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 6; i++) {
    const x = random.float() * WIDTH;
    const y = random.float() * HEIGHT;
    const radius = 200 + random.float() * 500;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, "rgba(150,130,90,0.05)");
    stain.addColorStop(1, "rgba(150,130,90,0)");
    ctx.fillStyle = stain;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.lineWidth = 1;
  if (ruling === "seyes") {
    ctx.strokeStyle = "rgba(150,140,200,0.35)";
    for (
      let y = FIRST_LINE - 3 * LINE_SPACING;
      y < HEIGHT;
      y += LINE_SPACING / 4
    ) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(120,110,190,0.45)";
    for (let x = LEFT_MARGIN + LINE_SPACING; x < WIDTH; x += LINE_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
  }
  ctx.strokeStyle =
    ruling === "seyes" ? "rgba(110,100,190,0.6)" : "rgba(90,140,200,0.5)";
  ctx.lineWidth = ruling === "seyes" ? 1.4 : 1.2;
  for (let y = FIRST_LINE - 2 * LINE_SPACING; y < HEIGHT; y += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(210,60,70,0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LEFT_MARGIN, 0);
  ctx.lineTo(LEFT_MARGIN, HEIGHT);
  ctx.stroke();
}

function drawLine(ctx: SKRSContext2D, line: Line, y: number, random: Random) {
  if (line.kind === "blank") return;
  const hand = line.hand;
  ctx.strokeStyle = hand.ink;
  ctx.fillStyle = hand.ink;
  if (line.kind === "rule") {
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
    return;
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
}

function createGrain(random: Random): Canvas {
  const side = 256;
  const grain = createCanvas(side, side);
  const ctx = grain.getContext("2d");
  const image = ctx.createImageData(side, side);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = random.float() < 0.5 ? 0 : 255;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = Math.floor(random.float() * 7);
  }
  ctx.putImageData(image, 0, 0);
  return grain;
}

function digitize(paper: Canvas, grain: Canvas, random: Random): Canvas {
  const scan = createCanvas(WIDTH, HEIGHT);
  const ctx = scan.getContext("2d");
  ctx.fillStyle = "rgb(214,214,210)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.translate(
    WIDTH / 2 + random.float() * 16 - 8,
    HEIGHT / 2 + random.float() * 16 - 8,
  );
  ctx.rotate(((random.float() - 0.5) * 1.6 * Math.PI) / 180);
  ctx.scale(0.975, 0.975);
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 12;
  ctx.drawImage(paper, -WIDTH / 2, -HEIGHT / 2);
  ctx.restore();

  const pattern = ctx.createPattern(grain, "repeat");
  if (pattern === null) throw new Error("motif de grain impossible à créer");
  ctx.save();
  ctx.translate(-random.int(0, 255), -random.int(0, 255));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, WIDTH + 256, HEIGHT + 256);
  ctx.restore();

  const vignette = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    HEIGHT * 0.35,
    WIDTH / 2,
    HEIGHT / 2,
    HEIGHT * 0.75,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(60,50,30,0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  return scan;
}

export async function renderScan(
  notebook: Notebook,
  seed: string,
): Promise<Uint8Array> {
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

  const pdf = await PDFDocument.create({ updateMetadata: false });
  for (const page of paginate(notebook, ctx, random)) {
    drawPaper(ctx, ruling, tint, random);
    page.forEach((line, i) =>
      drawLine(ctx, line, FIRST_LINE + i * LINE_SPACING, random),
    );
    const jpeg = await digitize(paper, grain, random).encode(
      "jpeg",
      JPEG_QUALITY,
    );
    const image = await pdf.embedJpg(jpeg);
    pdf.addPage(A4_POINTS).drawImage(image, {
      x: 0,
      y: 0,
      width: A4_POINTS[0],
      height: A4_POINTS[1],
    });
  }
  return pdf.save();
}
