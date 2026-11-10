// Constante de Cormack et al. (2009) : amortit l'écart entre les premiers rangs,
// pour qu'un passage bien classé par les deux recherches passe devant un
// passage premier d'une seule.
export const RRF_K = 60;

export interface FusedItem<T> {
  item: T;
  score: number;
}

// Reciprocal Rank Fusion : chaque classement donne 1 / (k + rang) à ses
// éléments, rang compté à partir de 1. À score égal, l'ordre de première
// apparition est conservé.
export function fuseRankings<T>(
  rankings: readonly (readonly T[])[],
  keyOf: (item: T) => string | number,
  k: number = RRF_K,
): FusedItem<T>[] {
  const fused = new Map<string | number, FusedItem<T>>();
  for (const ranking of rankings) {
    ranking.forEach((item, index) => {
      const key = keyOf(item);
      const contribution = 1 / (k + index + 1);
      const existing = fused.get(key);
      if (existing === undefined) fused.set(key, { item, score: contribution });
      else existing.score += contribution;
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score);
}
