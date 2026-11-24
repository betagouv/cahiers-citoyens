import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TranscriptionPanel } from "./transcription-panel";

describe("TranscriptionPanel", () => {
  it("affiche un paragraphe par bloc séparé d'une ligne vide, sans les blocs vides", () => {
    const html = renderToStaticMarkup(
      <TranscriptionPanel
        notebookId="notebook-0001"
        transcription={
          "  Premier bloc\nsur deux lignes  \n\n \n\nSecond bloc\n\n   "
        }
      />,
    );

    expect(html).toContain(
      'aria-label="Transcription du cahier notebook-0001"',
    );
    expect(
      [...html.matchAll(/<p [^>]*>([^<]*)<\/p>/g)].map(([, text]) => text),
    ).toEqual(["Premier bloc\nsur deux lignes", "Second bloc"]);
  });
});
