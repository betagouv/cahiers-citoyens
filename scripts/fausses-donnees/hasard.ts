export interface Hasard {
  reel(): number;
  entier(min: number, max: number): number;
  choix<T>(valeurs: readonly T[]): T;
  melange<T>(valeurs: readonly T[]): T[];
  probabilite(p: number): boolean;
  fils(etiquette: string): Hasard;
}

function hacher(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 : rapide, 32 bits d'état, suffisant pour des fausses données.
export function creerHasard(graine: number | string): Hasard {
  const racine = typeof graine === "number" ? graine >>> 0 : hacher(graine);
  let etat = racine;
  function reel(): number {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function entier(min: number, max: number): number {
    return min + Math.floor(reel() * (max - min + 1));
  }
  return {
    reel,
    entier,
    choix: (valeurs) => valeurs[entier(0, valeurs.length - 1)],
    melange: (valeurs) => {
      const copie = [...valeurs];
      for (let i = copie.length - 1; i > 0; i--) {
        const j = entier(0, i);
        [copie[i], copie[j]] = [copie[j], copie[i]];
      }
      return copie;
    },
    probabilite: (p) => reel() < p,
    fils: (etiquette) => creerHasard(`${racine}:${etiquette}`),
  };
}
