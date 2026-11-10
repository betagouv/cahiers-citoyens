export interface Random {
  float(): number;
  int(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: readonly T[]): T[];
  chance(p: number): boolean;
  child(label: string): Random;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 : rapide, 32 bits d'état, suffisant pour des fausses données.
export function createRandom(seed: number | string): Random {
  const root = typeof seed === "number" ? seed >>> 0 : hash(seed);
  let state = root;
  function float(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function int(min: number, max: number): number {
    return min + Math.floor(float() * (max - min + 1));
  }
  return {
    float,
    int,
    pick: (values) => values[int(0, values.length - 1)],
    shuffle: (values) => {
      const copy = [...values];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    chance: (p) => float() < p,
    child: (label) => createRandom(`${root}:${label}`),
  };
}
