import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  FIRST_LINE,
  HEIGHT,
  LEFT_MARGIN,
  LINE_SPACING,
  WIDTH,
} from "./page-geometry";
import type { Random } from "./random";

export type Ruling = "seyes" | "plain";

export function drawPaper(
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
