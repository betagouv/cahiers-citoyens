import * as crypto from "node:crypto";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { toNotebook } from "./condorcet-notebook";
import {
  type FingerprintInput,
  type FingerprintPage,
  notebookFingerprint,
  parseSha256,
  type Sha256,
} from "./fingerprint";
import type { Line } from "./notebook";
import { parseNotebookId } from "./notebook-id";
import { EXAMPLE_ID, exampleNotebook } from "./test-notebook";

vi.mock("node:crypto", { spy: true });

function sha256Of(content: string): Sha256 {
  const hash = parseSha256(createHash("sha256").update(content).digest("hex"));
  if (hash === undefined) throw new Error("SHA-256 invalide");
  return hash;
}

function example(): FingerprintInput {
  const id = parseNotebookId(EXAMPLE_ID);
  if (!id.ok) throw new Error(id.error.message);
  const { metadata, pages } = toNotebook(id.id, exampleNotebook());
  return {
    metadata,
    pages: pages.map((page) => ({
      ...page,
      imageSha256: sha256Of(`image ${page.number}`),
    })),
  };
}

const REFERENCE = notebookFingerprint(example());

function withPage(
  index: number,
  change: (page: FingerprintPage) => FingerprintPage,
): FingerprintInput {
  const input = example();
  return {
    ...input,
    pages: input.pages.map((page, i) => (i === index ? change(page) : page)),
  };
}

function withLine(change: (line: Line) => Line): FingerprintInput {
  return withPage(0, (page) => ({
    ...page,
    lines: page.lines.map((line, i) => (i === 0 ? change(line) : line)),
  }));
}

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

describe("notebookFingerprint, ce qui ne compte pas", () => {
  it("produit un SHA-256 hexadécimal stable", () => {
    expect(REFERENCE).toMatch(/^[0-9a-f]{64}$/);
    expect(notebookFingerprint(example())).toBe(REFERENCE);
  });

  it("ne dépend ni de l'id des pages ni de celui des lignes", () => {
    const input = withPage(0, (page) => ({
      ...page,
      id: "autre",
      lines: page.lines.map((line) => ({ ...line, id: `${line.id}-bis` })),
    }));
    expect(notebookFingerprint(input)).toBe(REFERENCE);
  });

  it("ne dépend pas de l'ordre des clés", () => {
    const { metadata, pages } = example();
    const reordered = {
      handwrittenTranscription: metadata.handwrittenTranscription,
      typedTranscription: metadata.typedTranscription,
      postalCode: metadata.postalCode,
      inseeCode: metadata.inseeCode,
      municipality: metadata.municipality,
      departmentCode: metadata.departmentCode,
      department: metadata.department,
    };
    expect(notebookFingerprint({ pages, metadata: reordered })).toBe(REFERENCE);
  });
});

describe("notebookFingerprint, ce qui compte", () => {
  it.each<[string, FingerprintInput]>([
    [
      "la commune",
      {
        ...example(),
        metadata: {
          ...example().metadata,
          municipality: "Exempleville-sur-Ain",
        },
      },
    ],
    [
      "le code postal",
      {
        ...example(),
        metadata: { ...example().metadata, postalCode: "01501" },
      },
    ],
    [
      "le mode de transcription",
      {
        ...example(),
        metadata: { ...example().metadata, typedTranscription: "manual" },
      },
    ],
    ["un numéro de page", withPage(1, (page) => ({ ...page, number: 2 }))],
    [
      "la largeur d'une page",
      withPage(1, (page) => ({ ...page, width: 2480 })),
    ],
    [
      "une image",
      withPage(1, (page) => ({
        ...page,
        imageSha256: sha256Of("image 3 bis"),
      })),
    ],
    ["le texte d'une ligne", withLine((line) => ({ ...line, text: "Cahier" }))],
    [
      "le type d'une ligne",
      withLine((line) => ({ ...line, kind: "handwritten" })),
    ],
    ["la zone d'une ligne", withLine((line) => ({ ...line, zone: "En-tête" }))],
    [
      "le polygone d'une ligne",
      withLine((line) => ({
        ...line,
        polygon: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      })),
    ],
    [
      "l'ordre des lignes",
      withPage(0, (page) => ({ ...page, lines: [...page.lines].reverse() })),
    ],
  ])("change avec %s", (_label, input) => {
    expect(notebookFingerprint(input)).not.toBe(REFERENCE);
  });

  it("distingue un texte déplacé d'une ligne à l'autre", () => {
    const joined = withPage(0, (page) => ({
      ...page,
      lines: [
        { ...page.lines[0], text: "ab" },
        { ...page.lines[1], text: "" },
      ],
    }));
    const split = withPage(0, (page) => ({
      ...page,
      lines: [
        { ...page.lines[0], text: "a" },
        { ...page.lines[1], text: "b" },
      ],
    }));
    expect(notebookFingerprint(joined)).not.toBe(notebookFingerprint(split));
  });

  it("refuse un condensat qui n'est pas un SHA-256", async () => {
    const actual = await vi.importActual<typeof crypto>("node:crypto");
    const input = example();
    vi.mocked(crypto.createHash).mockImplementationOnce(() =>
      actual.createHash("md5"),
    );
    expect(() => notebookFingerprint(input)).toThrow(
      /Empreinte SHA-256 inattendue/,
    );
  });
});
