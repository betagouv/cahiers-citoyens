import { describe, expect, it } from "vitest";
import { DEFECTS } from "./defects";
import { type DeliveryOptions, planDelivery } from "./delivery-plan";

const BASE: DeliveryOptions = {
  count: 12,
  seed: "42",
  createdAt: new Date("2026-11-24T09:30:00Z"),
  modify: 0,
  gaps: false,
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
      expect(notebook.gaps).toBe(false);
      expect(notebook.id).toBe(
        `CC_${notebook.metadata.code_postal}_${notebook.notebook.openedOn.replaceAll("-", "").slice(2)}_${notebook.metadata.code_insee}_MD_${10000 + notebook.index}`,
      );
      expect(notebook.metadata.commune).toBe(
        notebook.notebook.municipality.name,
      );
    }
  });

  it("produit surtout des JPEG nommés .png, mais aussi des PNG et des .jpg", () => {
    const styles = planDelivery({ ...BASE, count: 60 }).notebooks.map(
      ({ imageStyle }) => imageStyle,
    );
    expect(new Set(styles)).toEqual(new Set(["jpeg-named-png", "png", "jpg"]));
    const named = styles.filter((style) => style === "jpeg-named-png");
    expect(named.length).toBeGreaterThan(styles.length / 2);
  });

  it("transmet l'option des trous de pagination à chaque cahier", () => {
    const spec = planDelivery({ ...BASE, gaps: true });
    expect(spec.notebooks.every(({ gaps }) => gaps)).toBe(true);
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
    expect(new Set(kinds)).toEqual(new Set(["text", "image", "metadata"]));
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
    expect(spec.notebooks.flatMap(({ defects }) => defects)).toHaveLength(11);
    expect(spec.notebooks.every(({ defects }) => defects.length >= 5)).toBe(
      true,
    );
  });
});
