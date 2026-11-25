import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DeliverySpec, NotebookSpec } from "./delivery-plan";
import { registerFonts } from "./hands";
import { readArchive } from "./read-archive";
import { testSpec } from "./test-notebook";
import { describeNotebook, writeDelivery } from "./write-delivery";

const NOTEBOOK: NotebookSpec = testSpec();

function spec(createdAt: string): DeliverySpec {
  return { seed: "42", createdAt: new Date(createdAt), notebooks: [NOTEBOOK] };
}

let root = "";

beforeAll(async () => {
  registerFonts(join(import.meta.dirname, "fonts"));
  root = await mkdtemp(join(tmpdir(), "write-delivery-"));
});

afterAll(async () => {
  await rm(root, { recursive: true });
});

describe("describeNotebook", () => {
  it("ne dit rien d'un cahier conforme et non modifié", () => {
    expect(describeNotebook(NOTEBOOK)).toBeNull();
  });

  it("liste la modification et les défauts", () => {
    expect(
      describeNotebook({
        ...NOTEBOOK,
        change: "image",
        defects: ["duplicate-page", "invalid-image"],
      }),
    ).toBe(
      "CC_76600_190101_76351_MD_10001 : modifié (image), duplicate-page, invalid-image",
    );
    expect(describeNotebook({ ...NOTEBOOK, defects: ["duplicate-page"] })).toBe(
      "CC_76600_190101_76351_MD_10001 : duplicate-page",
    );
  });
});

describe("writeDelivery", () => {
  it(
    "rejoue les mêmes octets ; une autre date change le ZIP, pas son contenu",
    { timeout: 60_000 },
    async () => {
      const first = await writeDelivery(
        spec("2026-11-24T09:30:00Z"),
        join(root, "a"),
      );
      const again = await writeDelivery(
        spec("2026-11-24T09:30:00Z"),
        join(root, "b"),
      );
      const later = await writeDelivery(
        spec("2026-11-25T14:05:00Z"),
        join(root, "c"),
      );

      expect(basename(first)).toBe("delivery-2026-11-24-0930.zip");
      expect(basename(later)).toBe("delivery-2026-11-25-1405.zip");
      expect(await readdir(join(root, "a"))).toEqual([basename(first)]);

      const [a, b, c] = await Promise.all(
        [first, again, later].map((p) => readFile(p)),
      );
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);

      const [entriesA, entriesC] = await Promise.all([
        readArchive(a),
        readArchive(c),
      ]);
      expect(entriesC.map(({ path, bytes }) => [path, bytes])).toEqual(
        entriesA.map(({ path, bytes }) => [path, bytes]),
      );
      expect(entriesC[0].dosDate).not.toBe(entriesA[0].dosDate);
    },
  );
});
