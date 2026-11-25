import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { archiveBytes } from "./archive-bytes";
import { DEFECTS, type Defect } from "./defects";
import { deliveryEntries } from "./delivery-entries";
import type { NotebookSpec } from "./delivery-plan";
import { registerFonts } from "./hands";
import { type ArchiveRecord, readArchive } from "./read-archive";
import { shortNotebook } from "./test-notebook";

const AT = new Date("2026-11-24T09:30:00Z");
const IEND = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

interface Page {
  page: number;
  image: string;
  text?: string;
}

function spec(index: number, defects: Defect[]): NotebookSpec {
  return {
    index,
    id: `CC_${index}`,
    notebook: shortNotebook(),
    change: "none",
    defects,
  };
}

let records: ArchiveRecord[] = [];

function files(id: string): Map<string, Buffer> {
  const prefix = `notebooks/${id}/`;
  return new Map(
    records
      .filter(({ path }) => path.startsWith(prefix))
      .map(({ path, bytes }) => [path.slice(prefix.length), bytes]),
  );
}

function pages(id: string): Page[] {
  const json: unknown = JSON.parse(String(files(id).get("notebook.json")));
  if (typeof json !== "object" || json === null || !("pages" in json)) {
    throw new Error("notebook.json sans pages");
  }
  const list: unknown = json.pages;
  if (!Array.isArray(list)) throw new Error("pages n'est pas une liste");
  return list.map((page: Page) => page);
}

function idOf(defect: Defect): string {
  return `CC_${DEFECTS.indexOf(defect) + 1}`;
}

beforeAll(async () => {
  registerFonts(join(import.meta.dirname, "fonts"));
  const notebooks = [
    ...DEFECTS.map((defect, i) => spec(i + 1, [defect])),
    spec(10, []),
  ];
  records = await readArchive(
    await archiveBytes(
      deliveryEntries({ seed: "42", createdAt: AT, notebooks }),
      AT,
    ),
  );
}, 60_000);

describe("deliveryEntries, défaut par défaut, vus dans le ZIP", () => {
  it("un cahier sans défaut annonce exactement ses images, toutes des PNG complets", () => {
    const sound = files("CC_10");
    const listed = pages("CC_10").map(({ image }) => image);
    expect([...sound.keys()].sort()).toEqual(
      ["notebook.json", ...listed].sort(),
    );
    for (const image of listed) {
      expect(sound.get(image)?.subarray(-8).equals(IEND)).toBe(true);
    }
  });

  it("missing-image", () => {
    const id = idOf("missing-image");
    const listed = pages(id).map(({ image }) => image);
    expect(files(id).has(listed[listed.length - 1])).toBe(false);
  });

  it("unlisted-file", () => {
    expect(files(idOf("unlisted-file")).has("notes.txt")).toBe(true);
  });

  it("page-gap", () => {
    const numbers = pages(idOf("page-gap")).map(({ page }) => page);
    expect(numbers[numbers.length - 1]).toBe(numbers.length + 1);
  });

  it("duplicate-page", () => {
    const list = pages(idOf("duplicate-page"));
    expect(list[list.length - 1].page).toBe(list[list.length - 2].page);
    expect(files(idOf("duplicate-page")).has(list[list.length - 1].image)).toBe(
      true,
    );
  });

  it("invalid-png", () => {
    const png = files(idOf("invalid-png")).get("0001.png");
    expect(png?.subarray(-8).equals(IEND)).toBe(false);
  });

  it("invalid-json", () => {
    expect(() => pages(idOf("invalid-json"))).toThrow();
  });

  it("schema-violation", () => {
    const [first] = pages(idOf("schema-violation"));
    expect(first).not.toHaveProperty("text");
  });

  it("path-traversal", () => {
    expect(records.map(({ path }) => path)).toContain(
      `notebooks/${idOf("path-traversal")}/../../../escape.txt`,
    );
  });

  it("nested-folder", () => {
    expect(files(idOf("nested-folder")).has("scans/0001.png")).toBe(true);
  });
});
