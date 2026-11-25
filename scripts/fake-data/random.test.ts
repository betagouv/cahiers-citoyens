import { describe, expect, it } from "vitest";
import { createRandom } from "./random";

function draws(seed: number | string): number[] {
  const random = createRandom(seed);
  return Array.from({ length: 5 }, () => random.float());
}

describe("createRandom", () => {
  it("rejoue la même suite pour la même graine, texte ou nombre", () => {
    expect(draws("42")).toEqual(draws("42"));
    expect(draws(42)).toEqual(draws(42));
    expect(draws("42")).not.toEqual(draws("43"));
    expect(draws(42)).not.toEqual(draws("42"));
  });

  it("tire des flottants dans [0, 1) et des entiers dans les bornes", () => {
    const random = createRandom("bornes");
    for (let i = 0; i < 500; i++) {
      const f = random.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = random.int(3, 5);
      expect([3, 4, 5]).toContain(n);
    }
  });

  it("pioche, mélange sans perte et tire à pile ou face", () => {
    const random = createRandom("listes");
    const values = [1, 2, 3, 4, 5];
    expect(values).toContain(random.pick(values));
    const shuffled = random.shuffle(values);
    expect([...shuffled].sort()).toEqual(values);
    expect(values).toEqual([1, 2, 3, 4, 5]);
    expect(random.chance(1)).toBe(true);
    expect(random.chance(0)).toBe(false);
  });

  it("dérive des enfants indépendants du tirage du parent", () => {
    const a = createRandom("parent");
    const b = createRandom("parent");
    b.float();
    expect(a.child("x").float()).toBe(b.child("x").float());
    expect(a.child("x").float()).not.toBe(a.child("y").float());
  });
});
