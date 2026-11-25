import { describe, expect, it } from "vitest";
import {
  buildNotebookJson,
  imageName,
  PIPELINE_RELEASE,
  serializeJson,
} from "./notebook-json";

describe("imageName", () => {
  it("numérote sur quatre chiffres", () => {
    expect(imageName(1)).toBe("0001.png");
    expect(imageName(1234)).toBe("1234.png");
  });
});

describe("buildNotebookJson", () => {
  it("suit le format 1 du protocole, une entrée par page", () => {
    expect(buildNotebookJson("CC_X", ["Texte", ""])).toEqual({
      format: 1,
      source_filename: "CC_X.pdf",
      pipeline_release: PIPELINE_RELEASE,
      pages: [
        { page: 1, image: "0001.png", text: "Texte" },
        { page: 2, image: "0002.png", text: "" },
      ],
    });
  });
});

describe("serializeJson", () => {
  it("écrit du JSON UTF-8 indenté, terminé par un saut de ligne", () => {
    const bytes = serializeJson({ text: "Délibération" });
    expect(new TextDecoder().decode(bytes)).toBe(
      '{\n  "text": "Délibération"\n}\n',
    );
  });
});
