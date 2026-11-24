import { describe, expect, it } from "vitest";
import { DEFECTS } from "./defects";
import { type DeliveryOptions, planDelivery } from "./delivery-plan";

const BASE: DeliveryOptions = {
  count: 12,
  seed: "42",
  createdAt: new Date("2026-11-24T09:30:00Z"),
  modify: 0,
  defects: [],
};

describe("planDelivery", () => {
  it("prévoit des cahiers conformes et non modifiés par défaut", () => {
    const spec = planDelivery(BASE);
    expect(spec.seed).toBe("42");
    expect(spec.createdAt).toEqual(BASE.createdAt);
    expect(spec.notebooks.map(({ index }) => index)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    expect(new Set(spec.notebooks.map(({ id }) => id)).size).toBe(12);
    for (const notebook of spec.notebooks) {
      expect(notebook.change).toBe("none");
      expect(notebook.defects).toEqual([]);
    }
  });

  it("garde les mêmes cahiers quand on en modifie ou qu'on change la date", () => {
    const base = planDelivery(BASE);
    const other = planDelivery({
      ...BASE,
      modify: 3,
      createdAt: new Date("2027-01-01T00:00:00Z"),
    });
    expect(
      other.notebooks.map(({ id, notebook }) => ({ id, notebook })),
    ).toEqual(base.notebooks.map(({ id, notebook }) => ({ id, notebook })));
  });
});

describe("planDelivery, modifications", () => {
  it("modifie exactement N cahiers, toujours les mêmes", () => {
    const changed = planDelivery({ ...BASE, modify: 5 }).notebooks.filter(
      ({ change }) => change !== "none",
    );
    expect(changed).toHaveLength(5);
    expect(
      planDelivery({ ...BASE, modify: 5 }).notebooks.map(
        ({ change }) => change,
      ),
    ).toEqual(
      planDelivery({ ...BASE, modify: 5 }).notebooks.map(
        ({ change }) => change,
      ),
    );
    const kinds = planDelivery({ ...BASE, modify: 12 }).notebooks.map(
      ({ change }) => change,
    );
    expect(kinds).toContain("text");
    expect(kinds).toContain("image");
  });
});

describe("planDelivery, défauts", () => {
  it("place chaque défaut sur un cahier distinct, quel que soit l'ordre demandé", () => {
    const spec = planDelivery({ ...BASE, defects: [...DEFECTS].reverse() });
    const placed = spec.notebooks.flatMap(({ defects }) => defects);
    expect([...placed].sort()).toEqual([...DEFECTS].sort());
    for (const { defects } of spec.notebooks) {
      expect(defects.length).toBeLessThanOrEqual(1);
    }
    expect(planDelivery({ ...BASE, defects: DEFECTS })).toEqual(spec);
  });

  it("cumule les défauts quand il y a moins de cahiers que de défauts", () => {
    const spec = planDelivery({ ...BASE, count: 2, defects: DEFECTS });
    expect(spec.notebooks.flatMap(({ defects }) => defects)).toHaveLength(9);
    expect(spec.notebooks.every(({ defects }) => defects.length >= 4)).toBe(
      true,
    );
  });
});
