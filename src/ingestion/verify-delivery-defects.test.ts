import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFECTS, type Defect } from "../../scripts/fake-data/defects";
import type { NotebookSpec } from "../../scripts/fake-data/delivery-plan";
import { registerFonts } from "../../scripts/fake-data/hands";
import { testSpec } from "../../scripts/fake-data/test-notebook";
import { writeDelivery } from "../../scripts/fake-data/write-delivery";
import type { IngestError } from "./errors";
import { type TempDir, tempDir } from "./test-zip";
import { verifyDelivery } from "./verify-delivery";

// Chaque défaut injecté par le générateur de la phase 3 donne exactement
// l'erreur attendue, et rien d'autre.

const AT = new Date("2026-11-24T09:30:00Z");

let dir: TempDir;

beforeAll(async () => {
  registerFonts(join(import.meta.dirname, "../../scripts/fake-data/fonts"));
  dir = await tempDir("verify-defects-");
});

afterAll(async () => {
  await dir.remove();
});

function spec(notebooks: NotebookSpec[]) {
  return { seed: "42", createdAt: AT, notebooks };
}

function summary({ notebook, file, page, position, code }: IngestError) {
  return { notebook, file, page, position, code };
}

describe("verifyDelivery, défauts de la phase 3", () => {
  it.each<[Defect, ReturnType<typeof summary>[]]>([
    [
      "missing-image",
      [
        {
          notebook: "CC_1",
          file: "CC_1.json",
          page: 1,
          position: undefined,
          code: "missing-image",
        },
      ],
    ],
    [
      "unlisted-file",
      [
        {
          notebook: "CC_1",
          file: "CC_1_2.png",
          page: 2,
          position: undefined,
          code: "unlisted-file",
        },
      ],
    ],
    [
      "duplicate-page",
      [
        {
          notebook: "CC_1",
          file: "CC_1.json",
          page: 1,
          position: 2,
          code: "duplicate-page",
        },
      ],
    ],
    [
      "decreasing-pages",
      [
        {
          notebook: "CC_1",
          file: "CC_1.json",
          page: 1,
          position: 2,
          code: "page-out-of-order",
        },
      ],
    ],
    [
      "invalid-page-id",
      [
        {
          notebook: "CC_1",
          file: "CC_1.json",
          page: 1,
          position: 1,
          code: "invalid-page-id",
        },
      ],
    ],
    [
      "notebook-id-mismatch",
      [
        {
          notebook: "CC_1",
          file: "CC_1.json",
          page: undefined,
          position: undefined,
          code: "notebook-id-mismatch",
        },
      ],
    ],
    [
      "invalid-image",
      [
        {
          notebook: "CC_1",
          file: "CC_1_1.png",
          page: 1,
          position: undefined,
          code: "invalid-image",
        },
      ],
    ],
    [
      "invalid-json",
      [
        {
          notebook: "CC_1",
          file: "CC_1.json",
          page: undefined,
          position: undefined,
          code: "invalid-json",
        },
      ],
    ],
    [
      "schema-violation",
      [
        {
          notebook: "CC_1",
          file: "CC_1.json",
          page: undefined,
          position: 1,
          code: "missing-field",
        },
      ],
    ],
    [
      "path-traversal",
      [
        {
          notebook: undefined,
          file: "../../escape.txt",
          page: undefined,
          position: undefined,
          code: "invalid-entry-name",
        },
      ],
    ],
    [
      "nested-folder",
      [
        {
          notebook: undefined,
          file: "scans/CC_1_1.png",
          page: undefined,
          position: undefined,
          code: "nested-entry",
        },
      ],
    ],
  ])("%s", { timeout: 30_000 }, async (defect, expected) => {
    const notebook = testSpec({ index: 1, id: "CC_1", defects: [defect] });
    const path = await writeDelivery(spec([notebook]), join(dir.path, defect));
    const result = await verifyDelivery(path);
    expect(result.ok ? [] : result.errors.map(summary)).toEqual(expected);
  });

  it(
    "liste les erreurs de tous les cahiers d'un même dépôt",
    { timeout: 60_000 },
    async () => {
      const notebooks = [
        testSpec({ index: 0, id: "CC_0" }),
        ...DEFECTS.map((defect, i) =>
          testSpec({ index: i + 1, id: `CC_${i + 1}`, defects: [defect] }),
        ),
      ];
      const path = await writeDelivery(spec(notebooks), join(dir.path, "tous"));
      const result = await verifyDelivery(path);
      expect(result.ok).toBe(false);
      const errors = result.ok ? [] : result.errors;
      expect(errors).toHaveLength(DEFECTS.length);
      expect(errors.some(({ notebook }) => notebook === "CC_0")).toBe(false);
    },
  );
});
