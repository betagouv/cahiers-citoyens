import type { Point, Polygon } from "../../src/ingestion/notebook";
import { HEIGHT, LINE_SPACING, PAPER_SCALE, WIDTH } from "./page-geometry";

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

// Ramène un point de la feuille dans le scan. La rotation et le décalage de
// digitize() (moins d'un degré, quelques pixels) sont ignorés.
function onScan(x: number, y: number): Point {
  const scanX = WIDTH / 2 + PAPER_SCALE * (x - WIDTH / 2);
  const scanY = HEIGHT / 2 + PAPER_SCALE * (y - HEIGHT / 2);
  return [clamp(Math.round(scanX), WIDTH), clamp(Math.round(scanY), HEIGHT)];
}

// Rectangle d'une ligne écrite entre `start` et `end` sur la ligne de base
// `baseline`, en anneau fermé comme les polygones de Condorcet.
export function linePolygon(
  start: number,
  end: number,
  baseline: number,
): Polygon {
  const top = baseline - 0.75 * LINE_SPACING;
  const bottom = baseline + 0.25 * LINE_SPACING;
  const corners = [
    onScan(start, top),
    onScan(end, top),
    onScan(end, bottom),
    onScan(start, bottom),
  ];
  return [[...corners, corners[0]]];
}
