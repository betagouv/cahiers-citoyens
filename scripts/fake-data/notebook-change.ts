import type { Canvas } from "@napi-rs/canvas";

export function correctText(text: string): string {
  return `${text}\n\n[Transcription relue et corrigée]`;
}

export function stampCorrection(canvas: Canvas): void {
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.strokeStyle = "rgba(170,30,40,0.8)";
  ctx.fillStyle = "rgba(170,30,40,0.8)";
  ctx.lineWidth = 4;
  ctx.strokeRect(canvas.width - 330, 40, 280, 90);
  ctx.font = '36px "Patrick Hand"';
  ctx.fillText("Vu, corrigé", canvas.width - 300, 100);
  ctx.restore();
}
