import { fr } from "@codegouvfr/react-dsfr";
import type { OverlayConfig } from "carte-facile";
import { describe, expect, it, vi } from "vitest";
import {
  departmentsSource,
  mapPalette,
  statusFeatureStates,
} from "./department-map-style";

// Aucun département n'est encore connu comme absent du fonds : on en simule un.
vi.mock("./department-registry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./department-registry")>()),
  ABSENT_DEPARTMENT_CODES: ["55"],
}));

const overlay: OverlayConfig = {
  sources: {
    "admin-boundaries": {
      type: "vector",
      url: "https://tiles.example/admin.json",
    },
  },
  layers: [
    {
      id: "communes",
      type: "line",
      source: "admin-boundaries",
      "source-layer": "communes",
    },
    {
      id: "departements",
      type: "line",
      source: "admin-boundaries",
      "source-layer": "departements",
    },
  ],
};

describe("departmentsSource", () => {
  it("reprend la source des départements et les identifie par leur code", () => {
    expect(departmentsSource(overlay)).toEqual({
      id: "admin-boundaries",
      spec: {
        type: "vector",
        url: "https://tiles.example/admin.json",
        promoteId: { departements: "code" },
      },
    });
  });

  it("échoue si la surcouche n'a plus de couche des départements", () => {
    expect(() =>
      departmentsSource({ ...overlay, layers: overlay.layers.slice(0, 1) }),
    ).toThrow();
  });
});

describe("mapPalette", () => {
  it("donne à la légende les variables CSS du DSFR", () => {
    expect(mapPalette(fr.colors.decisions).status.online.fill).toBe(
      "var(--background-contrast-brown-caramel-active)",
    );
  });

  it("donne à MapLibre des couleurs hexadécimales qui suivent le thème", () => {
    const light = mapPalette(fr.colors.getHex({ isDark: false }).decisions);
    const dark = mapPalette(fr.colors.getHex({ isDark: true }).decisions);
    expect(light.status.upcoming.fill).toMatch(/^#[0-9a-f]{6}$/);
    expect(light.border).not.toBe(dark.border);
  });
});

describe("statusFeatureStates", () => {
  it("marque en ligne chaque code des zones publiées", () => {
    expect(statusFeatureStates()).toContainEqual({
      code: "973",
      status: "online",
    });
  });

  it("marque absents les départements sans cahier dans le fonds", () => {
    expect(statusFeatureStates()).toContainEqual({
      code: "55",
      status: "absent",
    });
  });
});
