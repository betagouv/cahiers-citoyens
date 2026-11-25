import type { Random } from "./random";

// Numéros de 1 à n, ou croissants avec des trous quand `gaps` est fourni :
// Condorcet livre parfois des pages 1, 5, 7 (à confirmer avec eux).
export function pageNumbers(count: number, gaps: Random | null): number[] {
  const numbers: number[] = [];
  let next = 1;
  for (let i = 0; i < count; i++) {
    numbers.push(next);
    next += 1 + (gaps !== null && gaps.chance(0.4) ? gaps.int(1, 3) : 0);
  }
  return numbers;
}
