import { describe, expect, it } from "vitest";
import { RRF_K, fuseRankings } from "./fusion";

function scores(rankings: string[][], k?: number) {
  return fuseRankings(rankings, (id) => id, k).map(({ item, score }) => [
    item,
    Number(score.toFixed(6)),
  ]);
}

describe("fuseRankings", () => {
  it("additionne 1 / (k + rang) sur chaque classement, rang à partir de 1", () => {
    expect(RRF_K).toBe(60);
    expect(
      scores([
        ["a", "b", "c"],
        ["c", "a"],
      ]),
    ).toEqual([
      ["a", Number((1 / 61 + 1 / 62).toFixed(6))],
      ["c", Number((1 / 63 + 1 / 61).toFixed(6))],
      ["b", Number((1 / 62).toFixed(6))],
    ]);
  });

  it("fait passer un élément présent dans les deux listes devant un premier isolé", () => {
    const fused = fuseRankings(
      [
        ["seul", "commun"],
        ["autre", "commun"],
      ],
      (id) => id,
    ).map(({ item }) => item);
    expect(fused).toEqual(["commun", "seul", "autre"]);
  });

  it("garde l'ordre de première apparition à score égal", () => {
    expect(
      fuseRankings([["x"], ["y"]], (id) => id).map(({ item }) => item),
    ).toEqual(["x", "y"]);
  });

  it("gère un classement vide et une constante k différente", () => {
    expect(scores([[], ["a"]], 0)).toEqual([["a", 1]]);
    expect(fuseRankings([[], []], (id: string) => id)).toEqual([]);
  });

  it("conserve l'objet de la première liste qui le contient", () => {
    const first = { id: 1, from: "texte" };
    const second = { id: 1, from: "vecteur" };
    const [fused] = fuseRankings([[first], [second]], (hit) => hit.id);
    expect(fused.item).toBe(first);
  });
});
