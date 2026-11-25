import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScanPanel } from "./scan-panel";

describe("ScanPanel", () => {
  it("intègre le scan servi par l'application et propose de l'ouvrir à part", () => {
    const html = renderToStaticMarkup(<ScanPanel notebookId="notebook-0001" />);

    expect(html).toContain(
      '<iframe src="/notebooks/notebook-0001/scan" title="Scan du cahier notebook-0001 (PDF)"',
    );
    expect(html).toMatch(
      /<a[^>]*href="\/notebooks\/notebook-0001\/scan"[^>]*target="_blank"[^>]*rel="noopener"[^>]*>Ouvrir le PDF<\/a>/,
    );
  });
});
