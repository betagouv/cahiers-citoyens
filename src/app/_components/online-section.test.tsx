import { describe, expect, it, vi } from "vitest";
import type { OnlineDepartment } from "@/lib/departments";
import { renderToHtml } from "@/test/render";
import {
  OnlineSection,
  OnlineSectionFallback,
  OnlineSectionView,
} from "./online-section";

const map = vi.hoisted(() => {
  const received: unknown[] = [];
  return { received };
});

// La carte, client et WebGL, a son propre test : on garde ce qu'elle reçoit.
vi.mock("@/app/_components/department-map", () => ({
  DepartmentMap: ({ departments }: { departments: unknown }) => {
    map.received.push(departments);
    return null;
  },
}));

const ONLINE: OnlineDepartment[] = [
  { code: "25", name: "Doubs", notebookCount: 2 },
  { code: "04", name: "Alpes-de-Haute-Provence", notebookCount: 1 },
  { code: "971", name: "Guadeloupe", notebookCount: 1 },
  { code: "974", name: "La Réunion", notebookCount: 1 },
];

vi.mock("next/server", () => ({ connection: async () => undefined }));

const listOnline = vi.hoisted(() => ({
  fail: false,
}));

vi.mock("@/lib/online-departments", () => ({
  listOnlineDepartments: async () => {
    if (listOnline.fail) throw new Error("base injoignable");
    return ONLINE;
  },
}));

function tagLabels(html: string): string[] {
  return [...html.matchAll(/class="fr-tag"[^>]*>([^<]+)</g)].map(
    (match) => match[1],
  );
}

describe("OnlineSection", () => {
  it("lit les départements en ligne et les passe à la carte", async () => {
    map.received.length = 0;
    const html = await renderToHtml(<OnlineSection />);

    expect(map.received).toEqual([ONLINE]);
    expect(html).toContain(
      "5 cahiers sont consultables aujourd&#x27;hui, dans 2 départements et les outre-mer.",
    );
  });
});

describe("OnlineSection sans base", () => {
  it("garde l'accueil debout et le dit dans la section", async () => {
    listOnline.fail = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const html = await renderToHtml(await OnlineSection());

      expect(html).toContain("Ce qui est en ligne");
      expect(html).toContain("momentanément indisponible");
      expect(html).not.toContain("base injoignable");
      expect(log).toHaveBeenCalledOnce();
    } finally {
      listOnline.fail = false;
      log.mockRestore();
    }
  });
});

describe("OnlineSectionView", () => {
  it("liste une étiquette par zone, l'outre-mer regroupé", async () => {
    const html = await renderToHtml(<OnlineSectionView departments={ONLINE} />);

    expect(tagLabels(html)).toEqual([
      "Alpes-de-Haute-Provence",
      "Doubs",
      "Outre-mer",
    ]);
    expect(html).toMatch(/href="\/search\?place=971,974"[^>]*>Outre-mer</);
    expect(html).toContain("Lire les cahiers d&#x27;un département");
    expect(html).toMatch(/href="\/publication"/);
  });

  it("légende les deux statuts de la carte", async () => {
    const html = await renderToHtml(<OnlineSectionView departments={ONLINE} />);

    expect(html).toContain("Cahiers en ligne");
    expect(html).toContain("Cahiers à venir");
  });

  it("reste lisible sans cahier publié : ni nombre nul, ni liste vide", async () => {
    const html = await renderToHtml(<OnlineSectionView departments={[]} />);

    expect(html).toContain("Aucun cahier n&#x27;est encore consultable.");
    expect(html).not.toContain("0 département");
    expect(html).not.toContain("fr-tags-group");
    expect(html).not.toContain("Lire les cahiers d&#x27;un département");
    expect(html).toMatch(/href="\/publication"/);
  });
});

describe("OnlineSectionFallback", () => {
  it("garde le titre et annonce le chargement", async () => {
    const html = await renderToHtml(<OnlineSectionFallback />);

    expect(html).toMatch(/<h2[^>]*>Ce qui est en ligne<\/h2>/);
    expect(html).toMatch(/role="status"[^>]*>Chargement des départements/);
  });
});
