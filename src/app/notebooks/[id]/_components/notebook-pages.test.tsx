import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import { NotebookPages } from "./notebook-pages";

const query = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({ useSearchParams: () => query.current }));

const PAGES = [{ number: 1, width: 100, height: 200, text: "Une retraite" }];

function render() {
  return renderToHtml(
    <NotebookPages notebookId="CC_1" version={2} pages={PAGES} />,
  );
}

describe("NotebookPages", () => {
  it("surligne le mot-clé de `?q=`, espaces normalisés", async () => {
    query.current = new URLSearchParams({ q: "  retraite " });

    const html = await render();

    expect(html).toMatch(/Une <mark[^>]*>retraite<\/mark>/);
    expect(html).toContain("1 occurrence de « retraite »");
  });

  it("ne change rien sans `?q=`", async () => {
    query.current = new URLSearchParams();

    const html = await render();

    expect(html).not.toContain("<mark");
    expect(html).not.toContain("occurrence");
    expect(html).toContain("Une retraite");
  });
});
