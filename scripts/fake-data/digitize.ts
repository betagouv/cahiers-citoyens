import { type Canvas, createCanvas } from "@napi-rs/canvas";
import { HEIGHT, WIDTH } from "./page-geometry";
import type { Random } from "./random";

export function createGrain(random: Random): Canvas {
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

export function digitize(paper: Canvas, grain: Canvas, random: Random): Canvas {
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
