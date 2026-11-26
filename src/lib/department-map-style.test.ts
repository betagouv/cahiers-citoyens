import { fr } from "@codegouvfr/react-dsfr";
import type { OverlayConfig } from "carte-facile";
import { describe, expect, it } from "vitest";
import {
  departmentsSource,
  mapPalette,
  statusFeatureStates,
} from "./department-map-style";

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
  it("marque en ligne chaque département qui a un cahier publié", () => {
    expect(
      statusFeatureStates([
        { code: "04", name: "Alpes-de-Haute-Provence", notebookCount: 1 },
        { code: "973", name: "Guyane", notebookCount: 2 },
      ]),
    ).toEqual([
      { code: "04", status: "online" },
      { code: "973", status: "online" },
    ]);
  });
});
