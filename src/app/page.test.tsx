import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import Home from "./page";

// La carte, client et WebGL, a son propre test.
vi.mock("@/app/_components/department-map", () => ({
  DepartmentMap: () => null,
}));

vi.mock("next/server", () => ({ connection: async () => undefined }));

vi.mock("@/lib/online-departments", () => ({
  listOnlineDepartments: async () => [
    { code: "25", name: "Doubs", notebookCount: 2 },
  ],
}));

describe("Home", () => {
  it("propose la recherche, les départements en ligne et les clés de lecture", async () => {
    const html = await renderToHtml(<Home />);

    expect(html).toMatch(/<h1[^>]*>Rechercher des cahiers citoyens<\/h1>/);
    expect(html).toMatch(/<form[^>]*action="\/search"/);
    expect(html).toContain("2 cahiers sont consultables aujourd&#x27;hui");
    expect(html).toMatch(/href="\/search\?place=25"[^>]*>Doubs</);
    expect(html).toContain("Pour bien lire les cahiers");
    expect(html).toMatch(/href="\/faq"/);
  });
});
