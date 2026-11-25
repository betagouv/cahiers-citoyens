import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseNotebookId } from "../../src/ingestion/notebook-id";
import { parseNotebook } from "../../src/ingestion/parse-notebook";
import { archiveBytes } from "./archive-bytes";
import { DEFECTS, type Defect } from "./defects";
import { deliveryEntries } from "./delivery-entries";
import { registerFonts } from "./hands";
import { type ArchiveRecord, readArchive } from "./read-archive";
import { testSpec } from "./test-notebook";

const AT = new Date("2026-11-24T09:30:00Z");
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const SOUND = "CC_0";

let records: ArchiveRecord[] = [];

function idOf(defect: Defect): string {
  return `CC_${DEFECTS.indexOf(defect) + 1}`;
}

// Fichiers d'un cahier à la racine du ZIP : <id>.json et <id>_<page>.<ext>.
function files(id: string): Map<string, Buffer> {
  const own = new RegExp(`^${id}(\\.json|_\\d+\\.(png|jpg))$`);
  return new Map(
    records
      .filter(({ path }) => own.test(path))
      .map(({ path, bytes }) => [path, bytes]),
  );
}

function parse(id: string) {
  const notebookId = parseNotebookId(id);
  if (!notebookId.ok) throw new Error(notebookId.error.message);
  const json = files(id).get(`${id}.json`);
  return parseNotebook(notebookId.id, String(json));
}

function errorsOf(id: string) {
  const result = parse(id);
  return result.ok
    ? []
    : result.errors.map(({ code, page }) => ({ code, page }));
}

beforeAll(async () => {
  registerFonts(join(import.meta.dirname, "fonts"));
  const notebooks = [
    testSpec({ index: 0, id: SOUND }),
    ...DEFECTS.map((defect, i) =>
      testSpec({ index: i + 1, id: `CC_${i + 1}`, defects: [defect] }),
    ),
  ];
  records = await readArchive(
    await archiveBytes(
      deliveryEntries({ seed: "42", createdAt: AT, notebooks }),
      AT,
    ),
  );
}, 60_000);

describe("deliveryEntries, cahier conforme", () => {
  it("met à plat le JSON et une image JPEG nommée .png par page", () => {
    const result = parse(SOUND);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    const images = result.notebook.pages.map(({ id }) => `${id}.png`);
    expect([...files(SOUND).keys()].sort()).toEqual(
      [`${SOUND}.json`, ...images].sort(),
    );
    for (const image of images) {
      expect(files(SOUND).get(image)?.subarray(0, 3).equals(JPEG)).toBe(true);
    }
  });
});

describe("deliveryEntries, chaque défaut vu par le parseur", () => {
  it.each<[Defect, { code: string; page?: number }[]]>([
    ["duplicate-page", [{ code: "duplicate-page", page: 2 }]],
    ["decreasing-pages", [{ code: "page-out-of-order", page: 2 }]],
    ["invalid-page-id", [{ code: "invalid-page-id", page: 1 }]],
    ["notebook-id-mismatch", [{ code: "notebook-id-mismatch" }]],
    ["invalid-json", [{ code: "invalid-json" }]],
    ["schema-violation", [{ code: "missing-field", page: 1 }]],
    ["missing-image", []],
    ["unlisted-file", []],
    ["invalid-image", []],
    ["path-traversal", []],
    ["nested-folder", []],
  ])("%s", (defect, expected) => {
    expect(errorsOf(idOf(defect))).toEqual(
      expected.map(({ code, page }) => ({ code, page })),
    );
  });

  it("le cahier conforme passe", () => {
    expect(errorsOf(SOUND)).toEqual([]);
  });
});

describe("deliveryEntries, défauts propres à l'archive", () => {
  it("missing-image", () => {
    expect([...files(idOf("missing-image")).keys()]).toEqual(["CC_1.json"]);
  });

  it("unlisted-file : l'image d'une page 3 que le JSON n'annonce pas", () => {
    const result = parse(idOf("unlisted-file"));
    expect(result.ok && result.notebook.pages.length).toBe(2);
    expect([...files(idOf("unlisted-file")).keys()]).toEqual([
      "CC_2.json",
      "CC_2_1.png",
      "CC_2_2.png",
      "CC_2_3.png",
    ]);
  });

  it("invalid-image", () => {
    const image = files(idOf("invalid-image")).get("CC_7_1.png");
    expect(String(image)).toBe("Ceci n'est pas une image.\n");
  });

  it("path-traversal et nested-folder", () => {
    const paths = records.map(({ path }) => path);
    expect(paths).toContain("../../escape.txt");
    expect(paths).toContain("scans/CC_11_1.png");
  });
});
