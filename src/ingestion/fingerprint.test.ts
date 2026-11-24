import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { notebookFingerprint, parseSha256 } from "./fingerprint";
import type { FingerprintPage, Sha256 } from "./fingerprint";

function sha256Of(content: string): Sha256 {
  const hash = parseSha256(createHash("sha256").update(content).digest("hex"));
  if (hash === undefined) {
    throw new Error("SHA-256 invalide");
  }
  return hash;
}

const PAGES: FingerprintPage[] = [
  { page: 1, imageSha256: sha256Of("image 1"), text: "Délibération" },
  { page: 2, imageSha256: sha256Of("image 2"), text: "" },
  { page: 3, imageSha256: sha256Of("image 3"), text: "Suite du texte" },
];

describe("parseSha256", () => {
  it("accepte un SHA-256 hexadécimal en minuscules", () => {
    expect(parseSha256("a".repeat(64))).toBe("a".repeat(64));
  });

  it.each(["A".repeat(64), "a".repeat(63), "a".repeat(65), "g".repeat(64)])(
    "refuse %s",
    (value) => {
      expect(parseSha256(value)).toBeUndefined();
    },
  );
});

describe("notebookFingerprint", () => {
  const reference = notebookFingerprint(PAGES);

  it("produit un SHA-256 hexadécimal en minuscules", () => {
    expect(reference).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ne dépend pas de l'ordre des clés", () => {
    const reordered = PAGES.map(({ page, imageSha256, text }) => ({
      text,
      imageSha256,
      page,
    }));
    expect(notebookFingerprint(reordered)).toBe(reference);
  });

  it("ne dépend pas du nom des images", () => {
    const renamed = PAGES.map((page) => ({
      ...page,
      image: `renamed-${page.page}.png`,
    }));
    expect(notebookFingerprint(renamed)).toBe(reference);
  });

  it("change quand un texte change", () => {
    const pages = PAGES.map((page) =>
      page.page === 2 ? { ...page, text: " " } : page,
    );
    expect(notebookFingerprint(pages)).not.toBe(reference);
  });

  it("change quand une image change", () => {
    const pages = PAGES.map((page) =>
      page.page === 3
        ? { ...page, imageSha256: sha256Of("image 3 bis") }
        : page,
    );
    expect(notebookFingerprint(pages)).not.toBe(reference);
  });

  it("change quand deux pages échangent leur contenu", () => {
    const [first, second, third] = PAGES;
    const swapped = [{ ...second, page: 1 }, { ...first, page: 2 }, third];
    expect(notebookFingerprint(swapped)).not.toBe(reference);
  });

  it("distingue un texte déplacé d'une page à l'autre", () => {
    const pages: FingerprintPage[] = [
      { page: 1, imageSha256: PAGES[0].imageSha256, text: "ab" },
      { page: 2, imageSha256: PAGES[1].imageSha256, text: "" },
    ];
    const shifted: FingerprintPage[] = [
      { page: 1, imageSha256: PAGES[0].imageSha256, text: "a" },
      { page: 2, imageSha256: PAGES[1].imageSha256, text: "b" },
    ];
    expect(notebookFingerprint(pages)).not.toBe(notebookFingerprint(shifted));
  });
});
