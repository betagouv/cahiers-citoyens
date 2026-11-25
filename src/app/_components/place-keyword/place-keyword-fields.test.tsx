// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Mounted,
  click,
  mount,
  press,
  typeInto,
  unmount,
} from "@/test/dom";
import { PlaceKeywordFields } from "./place-keyword-fields";
import { DEBOUNCE_MS } from "./use-debounced-json";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const CHAROLLES = {
  kind: "municipality",
  code: "71106",
  name: "Charolles",
  departmentCode: "71",
  departmentName: "Saône-et-Loire",
  pageCount: 286,
};
const CHARENTE = {
  kind: "department",
  code: "16",
  name: "Charente",
  departmentCode: "16",
  departmentName: "Charente",
  pageCount: 0,
};

// Réponses par chemin ; `fetch` mémorise chaque URL demandée.
const routes = new Map<string, unknown>();
const requested: string[] = [];

function fakeFetch(url: string, init: RequestInit) {
  requested.push(url);
  if (init.signal?.aborted) return Promise.reject(new Error("abandon"));
  const path = url.split("?")[0];
  if (!routes.has(path)) return Promise.resolve({ ok: false });
  return Promise.resolve({ ok: true, json: async () => routes.get(path) });
}

let mounted: Mounted;

function field(id: string) {
  const element = mounted.container.querySelector(`#${id}`);
  if (!(element instanceof HTMLInputElement)) throw new Error(`${id} absent`);
  return element;
}

function buttonText() {
  return mounted.container.querySelector('button[type="submit"]')?.textContent;
}

async function settle() {
  await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  routes.clear();
  requested.length = 0;
  routes.set("/api/suggestions/places", { suggestions: [CHARENTE, CHAROLLES] });
  routes.set("/api/suggestions/words", {
    suggestions: [
      { word: "retraite", pageCount: 7 },
      { word: "retraité", pageCount: 1 },
    ],
  });
  routes.set("/api/pages/count", { pageCount: 7 });
});

afterEach(() => {
  unmount(mounted);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function render(
  initialPlace: Parameters<typeof PlaceKeywordFields>[0]["initialPlace"] = null,
) {
  return mount(
    <PlaceKeywordFields
      id="t"
      initialPlace={initialPlace}
      initialPlaceText=""
      initialKeyword=""
    />,
  );
}

describe("PlaceKeywordFields", () => {
  it("part d'un formulaire vide qui envoie le lieu saisi", async () => {
    mounted = await render();

    expect(field("t-place").name).toBe("place");
    expect(field("t-keyword").name).toBe("q");
    expect(buttonText()).toBe("Rechercher");
  });

  it("propose les lieux une fois la frappe posée, une seule requête", async () => {
    mounted = await render();

    await typeInto(field("t-place"), "C");
    await typeInto(field("t-place"), "Ch");
    await typeInto(field("t-place"), "Char");
    await settle();

    expect(requested).toEqual(["/api/suggestions/places?q=Char"]);
    const options = [...mounted.container.querySelectorAll('[role="option"]')];
    expect(options.map((option) => option.textContent)).toEqual([
      "Charente (16)DépartementÀ venir",
      "CharollesCommune · Saône-et-Loire (71)286 pages",
    ]);
    expect(options[1].querySelector(".font-bold")?.textContent).toBe("Char");
  });

  it("envoie le code du lieu choisi et annonce ses pages", async () => {
    mounted = await render();
    await typeInto(field("t-place"), "Char");
    await settle();

    await press(field("t-place"), "ArrowDown");
    await press(field("t-place"), "ArrowDown");
    await press(field("t-place"), "Enter");

    expect(field("t-place").value).toBe("Charolles (71)");
    expect(field("t-place").hasAttribute("name")).toBe(false);
    const hidden = mounted.container.querySelector('input[type="hidden"]');
    expect(hidden?.getAttribute("name")).toBe("place");
    expect(hidden?.getAttribute("value")).toBe("71106");
    expect(buttonText()).toBe("Voir les 286 pages");
  });

  it("propose les mots du lieu choisi et compte les pages du mot-clé", async () => {
    mounted = await render({
      code: "71106",
      label: "Charolles (71)",
      pageCount: 286,
    });

    await typeInto(field("t-keyword"), "retr");
    expect(buttonText()).toBe("Voir les pages");
    expect(mounted.container.querySelector("svg")).not.toBeNull();
    await settle();

    expect(requested).toEqual([
      "/api/suggestions/words?q=retr&place=71106",
      "/api/pages/count?q=retr&place=71106",
    ]);
    const options = [...mounted.container.querySelectorAll('[role="option"]')];
    expect(options[1].textContent).toBe("retraité1 page");
    await click(options[1]);
    routes.set("/api/pages/count", { pageCount: 1 });
    await settle();

    expect(field("t-keyword").value).toBe("retraité");
    expect(buttonText()).toBe("Voir la page");
  });

  it("compte un mot-clé dans toute la France sans lieu", async () => {
    mounted = await render();

    await typeInto(field("t-keyword"), "retraite");
    await settle();

    expect(requested).toContain("/api/pages/count?q=retraite");
    expect(buttonText()).toBe("Voir les 7 pages");
  });

  it("ne compte pas tant que le lieu saisi n'est pas choisi", async () => {
    mounted = await render();
    routes.set("/api/suggestions/places", { suggestions: [] });

    await typeInto(field("t-place"), "Nulle part");
    await typeInto(field("t-keyword"), "retraite");
    await settle();

    expect(requested.some((url) => url.startsWith("/api/pages/count"))).toBe(
      false,
    );
    expect(buttonText()).toBe("Rechercher");
    expect(mounted.container.textContent).toContain(
      "Aucun lieu ne correspond à cette saisie.",
    );
  });

  it("oublie le lieu choisi quand on le modifie ou l'efface", async () => {
    mounted = await render({
      code: "71106",
      label: "Charolles (71)",
      pageCount: 286,
    });

    await typeInto(field("t-place"), "Charolles (7");

    expect(field("t-place").name).toBe("place");
    expect(mounted.container.querySelector('input[type="hidden"]')).toBeNull();
    expect(buttonText()).toBe("Rechercher");
  });

  it("ignore une réponse en erreur ou mal formée", async () => {
    mounted = await render();
    routes.delete("/api/pages/count");

    await typeInto(field("t-keyword"), "retraite");
    await settle();
    expect(buttonText()).toBe("Rechercher");

    routes.set("/api/suggestions/words", "pas du JSON attendu");
    await typeInto(field("t-keyword"), "impôts");
    await settle();
    expect(mounted.container.textContent).toContain(
      "Aucun mot des cahiers publiés ne commence ainsi.",
    );
  });

  it("n'affirme rien quand le serveur échoue", async () => {
    mounted = await render();
    routes.delete("/api/suggestions/places");

    await typeInto(field("t-place"), "Char");
    await settle();

    expect(field("t-place").getAttribute("aria-expanded")).toBe("false");
    expect(mounted.container.textContent).not.toContain("Aucun lieu");
  });

  it("abandonne la requête précédente quand la saisie change", async () => {
    mounted = await render();
    vi.mocked(fetch).mockImplementationOnce(
      (url, init) =>
        new Promise((_, reject) => {
          requested.push(String(url));
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("abandon")),
          );
        }),
    );

    await typeInto(field("t-keyword"), "retraite");
    await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
    await typeInto(field("t-keyword"), "retraites");
    await settle();

    expect(buttonText()).toBe("Voir les 7 pages");
  });
});
