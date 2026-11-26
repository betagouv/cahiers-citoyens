import { describe, expect, it } from "vitest";
import { BATCH_SIZE, batches } from "./batches";

describe("batches", () => {
  it("découpe en lots de la taille demandée, le dernier incomplet", () => {
    expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("ne donne aucun lot pour aucune ligne", () => {
    expect(batches([])).toEqual([]);
  });

  it("garde par défaut BATCH_SIZE lignes par lot", () => {
    const rows = Array.from({ length: BATCH_SIZE + 1 }, (_, i) => i);
    expect(batches(rows).map((batch) => batch.length)).toEqual([BATCH_SIZE, 1]);
  });
});
