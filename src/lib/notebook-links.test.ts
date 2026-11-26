import { describe, expect, it } from "vitest";
import {
  keywordLinesSrc,
  notebookHref,
  pageAnchor,
  pageImageSrc,
} from "./notebook-links";

describe("pageAnchor", () => {
  it("nomme l'ancre d'une page par son numéro", () => {
    expect(pageAnchor(3)).toBe("page-3");
  });
});

describe("notebookHref", () => {
  it("mène au cahier, ou à l'une de ses pages", () => {
    expect(notebookHref("CC_1")).toBe("/notebooks/CC_1");
    expect(notebookHref("CC_1", null)).toBe("/notebooks/CC_1");
    expect(notebookHref("CC_1", 3)).toBe("/notebooks/CC_1#page-3");
  });

  it("porte le mot-clé à surligner, encodé, avant l'ancre", () => {
    expect(notebookHref("CC_1", 3, "impôt juste")).toBe(
      "/notebooks/CC_1?q=imp%C3%B4t+juste#page-3",
    );
    expect(notebookHref("CC_1", null, "")).toBe("/notebooks/CC_1");
  });

  it("encode l'identifiant", () => {
    expect(notebookHref("cahier été")).toBe(
      "/notebooks/cahier%20%C3%A9t%C3%A9",
    );
  });
});

describe("pageImageSrc", () => {
  it("désigne l'image d'une page dans une version", () => {
    expect(pageImageSrc("CC 1", 3, 2)).toBe("/notebooks/CC%201/pages/3?v=2");
  });
});

describe("keywordLinesSrc", () => {
  it("désigne les lignes d'une version qui contiennent le mot-clé", () => {
    expect(keywordLinesSrc("CC 1", 2, "impôt")).toBe(
      "/notebooks/CC%201/lines?v=2&q=imp%C3%B4t",
    );
  });
});
