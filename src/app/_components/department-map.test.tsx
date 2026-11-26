// @vitest-environment happy-dom
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OnlineDepartment } from "@/lib/departments";
import { DepartmentMap } from "./department-map";

const ONLINE: OnlineDepartment[] = [
  { code: "25", name: "Doubs", notebookCount: 3 },
  { code: "972", name: "Martinique", notebookCount: 1 },
  { code: "974", name: "La Réunion", notebookCount: 2 },
];

type Listener = (event?: unknown) => void;

const state = vi.hoisted(() => {
  const value: { isDark: boolean; pushed: string[]; maps: FakeMapShape[] } = {
    isDark: false,
    pushed: [],
    maps: [],
  };
  return value;
});

const router = vi.hoisted(() => ({
  push: (href: string) => {
    state.pushed.push(href);
  },
}));

interface FakeMapShape {
  listeners: Map<string, Listener[]>;
  featureStates: Map<string, Record<string, unknown>>;
  styles: unknown[];
  fitted: number;
  removed: boolean;
  canvas: { style: { cursor: string } };
}

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@codegouvfr/react-dsfr/useIsDark", () => ({
  useIsDark: () => ({ isDark: state.isDark }),
}));

vi.mock("carte-facile", () => ({
  mapOverlays: {
    administrativeBoundaries: {
      neutral: {
        sources: {
          boundaries: {
            type: "vector",
            url: "https://tiles.example/admin.json",
          },
        },
        layers: [
          {
            id: "departments",
            type: "line",
            source: "boundaries",
            "source-layer": "departements",
          },
        ],
      },
    },
  },
}));

vi.mock("maplibre-gl", () => {
  class FakeMap implements FakeMapShape {
    listeners = new Map<string, Listener[]>();
    featureStates = new Map<string, Record<string, unknown>>();
    styles: unknown[];
    fitted = 0;
    removed = false;
    canvas = { style: { cursor: "" } };
    constructor(options: { style: unknown }) {
      this.styles = [options.style];
      state.maps.push(this);
    }
    on(type: string, layerOrListener: string | Listener, listener?: Listener) {
      const key =
        listener === undefined ? type : `${type}:${String(layerOrListener)}`;
      const handler = listener ?? layerOrListener;
      if (typeof handler === "string") return;
      this.listeners.set(key, [...(this.listeners.get(key) ?? []), handler]);
    }
    setFeatureState(feature: { id: string }, values: Record<string, unknown>) {
      this.featureStates.set(feature.id, {
        ...this.featureStates.get(feature.id),
        ...values,
      });
    }
    setStyle(style: unknown) {
      this.styles.push(style);
    }
    fitBounds() {
      this.fitted += 1;
    }
    getCanvas() {
      return this.canvas;
    }
    remove() {
      this.removed = true;
    }
  }
  return { Map: FakeMap, setWorkerUrl: () => undefined };
});

function metropole() {
  return state.maps[5];
}

function fire(map: FakeMapShape, key: string, event?: unknown) {
  for (const listener of map.listeners.get(key) ?? []) listener(event);
}

function hover(code: unknown, name: unknown = "Doubs") {
  return {
    point: { x: 10, y: 20 },
    features: [{ properties: { code, nom: name } }],
  };
}

let container: HTMLDivElement;
let root: Root;

async function render() {
  await act(async () => {
    root.render(<DepartmentMap departments={ONLINE} />);
    await Promise.resolve();
  });
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.isDark = false;
  state.pushed = [];
  state.maps = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("DepartmentMap", () => {
  it("dessine la métropole et les cinq médaillons d'outre-mer, cachés aux aides techniques", async () => {
    await render();

    expect(state.maps).toHaveLength(6);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("colore les départements selon leur statut une fois la carte chargée", async () => {
    await render();
    fire(metropole(), "load");

    expect(metropole().featureStates.get("25")).toEqual({ status: "online" });
    expect(metropole().featureStates.get("974")).toEqual({ status: "online" });
    expect(metropole().featureStates.has("75")).toBe(false);
  });

  it("affiche le département survolé et sa disponibilité, puis l'efface en sortant", async () => {
    await render();
    await act(() =>
      fire(metropole(), "mousemove:departments-fill", hover("25")),
    );

    expect(container.textContent).toContain("Doubs (25) · 3 cahiers en ligne");
    expect(metropole().canvas.style.cursor).toBe("pointer");
    expect(metropole().featureStates.get("25")).toEqual({ hover: true });

    await act(() =>
      fire(metropole(), "mousemove:departments-fill", hover("75", "Paris")),
    );
    expect(container.textContent).toContain("Paris (75) · Cahiers à venir");
    expect(metropole().canvas.style.cursor).toBe("");
    expect(metropole().featureStates.get("25")).toEqual({ hover: false });

    await act(() => fire(metropole(), "mouseleave:departments-fill"));
    expect(container.textContent).toBe("");
    expect(metropole().featureStates.get("75")).toEqual({ hover: false });
  });

  it("ignore une entité sans code ni nom lisibles", async () => {
    await render();
    await act(() => fire(metropole(), "mousemove:departments-fill", hover(25)));
    await act(() =>
      fire(metropole(), "mousemove:departments-fill", hover("25", null)),
    );
    for (const event of [{}, { features: [] }, { features: [{}] }])
      await act(() => fire(metropole(), "mousemove:departments-fill", event));

    expect(container.textContent).toBe("");
  });

  it("ouvre les cahiers d'un département en ligne au clic, et rien pour les autres", async () => {
    await render();
    fire(metropole(), "click:departments-fill", hover("972"));
    fire(metropole(), "click:departments-fill", hover("75"));
    fire(metropole(), "click:departments-fill", hover(undefined));
    fire(metropole(), "click:departments-fill", {});
    fire(metropole(), "click:departments-fill", { features: [] });
    fire(metropole(), "click:departments-fill", { features: [{}] });

    expect(state.pushed).toEqual(["/search?place=972,974"]);
  });

  it("recadre la carte quand son conteneur change de taille", async () => {
    await render();
    fire(metropole(), "resize");

    expect(metropole().fitted).toBe(1);
  });

  it("repeint la carte quand le thème change, avant comme après son chargement", async () => {
    await render();
    const [before, after] = [state.maps[0], metropole()];
    fire(after, "load");

    state.isDark = true;
    await render();
    expect(after.styles).toHaveLength(2);

    fire(before, "load");
    expect(before.styles).toHaveLength(2);
  });

  it("détruit les cartes au démontage, même chargées après coup", async () => {
    await act(async () => {
      root.render(<DepartmentMap departments={ONLINE} />);
    });
    act(() => root.unmount());
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    root = createRoot(container);

    expect(state.maps.every((map) => map.removed)).toBe(true);
  });
});
