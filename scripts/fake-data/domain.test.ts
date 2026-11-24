import { describe, expect, it } from "vitest";
import { toManifestLine } from "./domain";
import { shortNotebook } from "./test-notebook";

describe("toManifestLine", () => {
  it("garde la commune et le thème de chaque contribution, sans le texte", () => {
    const notebook = shortNotebook();
    expect(toManifestLine(notebook)).toEqual({
      id: "notebook-0001",
      municipality: notebook.municipality,
      openedOn: "2019-01-01",
      contributions: [
        { position: 1, theme: "taxes" },
        { position: 2, theme: "health" },
      ],
    });
  });
});
