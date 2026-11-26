import { createHash } from "node:crypto";
import { readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type DeliverySpec,
  type NotebookSpec,
  planDelivery,
} from "../../scripts/fake-data/delivery-plan";
import { registerFonts } from "../../scripts/fake-data/hands";
import type { ImageStyle } from "../../scripts/fake-data/page-image";
import { readArchive } from "../../scripts/fake-data/read-archive";
import { writeDelivery } from "../../scripts/fake-data/write-delivery";
import { notebookFingerprint, parseSha256 } from "./fingerprint";
import { parseNotebookId } from "./notebook-id";
import { parseNotebook } from "./parse-notebook";
import { type TempDir, tempDir, zipBuffer } from "./test-zip";
import {
  type VerificationResult,
  type VerifiedDelivery,
  verifyDelivery,
} from "./verify-delivery";

const AT = new Date("2026-11-24T09:30:00Z");
const STYLES: ImageStyle[] = ["jpeg-named-png", "png", "jpg"];

let dir: TempDir;

beforeAll(async () => {
  registerFonts(join(import.meta.dirname, "../../scripts/fake-data/fonts"));
  dir = await tempDir("verify-delivery-");
});

afterAll(async () => {
  await dir.remove();
});

function spec(notebooks: NotebookSpec[], createdAt = AT): DeliverySpec {
  return { seed: "42", createdAt, notebooks };
}

// Trois cahiers à plusieurs pages, avec des trous de numérotation, un par
// style d'image : JPEG nommé .png, vrai PNG, JPEG nommé .jpg.
function healthySpec(createdAt = AT): DeliverySpec {
  const planned = planDelivery({
    count: 3,
    seed: "42",
    createdAt,
    modify: 0,
    gaps: true,
    defects: [],
  });
  return spec(
    planned.notebooks.map((notebook, i) => ({
      ...notebook,
      imageStyle: STYLES[i],
    })),
    createdAt,
  );
}

function delivered(result: VerificationResult): VerifiedDelivery {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.delivery;
}

function sha256(bytes: Buffer) {
  const hash = parseSha256(createHash("sha256").update(bytes).digest("hex"));
  if (hash === undefined) throw new Error("SHA-256 invalide");
  return hash;
}

// Empreintes recalculées sans le vérificateur : ZIP lu en mémoire, JSON
// parsé, chaque image hachée.
async function independentFingerprints(path: string) {
  const files = new Map(
    (await readArchive(await readFile(path))).map((r) => [r.path, r.bytes]),
  );
  return [...files.keys()]
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const id = parseNotebookId(name.slice(0, -".json".length));
      if (!id.ok) throw new Error(id.error.message);
      const parsed = parseNotebook(id.id, String(files.get(name)));
      if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
      const { metadata, pages } = parsed.notebook;
      return notebookFingerprint({
        metadata,
        pages: pages.map((page) => {
          const image = [...files.keys()].find((f) =>
            f.startsWith(`${page.id}.`),
          );
          return {
            ...page,
            imageSha256: sha256(files.get(image ?? "") ?? Buffer.alloc(0)),
          };
        }),
      });
    });
}

describe("verifyDelivery, dépôt sain", () => {
  let path = "";
  let delivery: VerifiedDelivery;

  beforeAll(async () => {
    path = await writeDelivery(healthySpec(), join(dir.path, "sain"));
    delivery = delivered(await verifyDelivery(path));
  }, 60_000);

  it("accepte JPEG nommés .png, vrais PNG, .jpg et trous de numérotation", () => {
    expect(delivery.name).toBe("delivery-2026-11-24-0930.zip");
    expect(delivery.notebooks).toHaveLength(3);
    const [jpegAsPng, png, jpg] = delivery.notebooks.map(
      ({ images }) => images,
    );
    expect(
      jpegAsPng.every((i) => i.type === "jpeg" && i.entryName.endsWith(".png")),
    ).toBe(true);
    expect(
      png.every((i) => i.type === "png" && i.entryName.endsWith(".png")),
    ).toBe(true);
    expect(
      jpg.every((i) => i.type === "jpeg" && i.entryName.endsWith(".jpg")),
    ).toBe(true);
    const numbers = delivery.notebooks.flatMap(({ notebook }) =>
      notebook.pages.map(({ number }, i) => number - i - 1),
    );
    expect(numbers.some((offset) => offset > 0)).toBe(true);
  });

  it("donne une image par page, aux dimensions lues dans l'image", () => {
    for (const { notebook, images } of delivery.notebooks) {
      expect(images.map(({ page }) => page)).toEqual(
        notebook.pages.map(({ number }) => number),
      );
      for (const image of images) {
        expect(image).toMatchObject({ width: 1240, height: 1754 });
        expect(image.entryName).toMatch(
          new RegExp(`^${notebook.id}_${image.page}\\.(png|jpg)$`),
        );
        expect(image.bytes).toBeGreaterThan(1000);
      }
    }
  });

  it("calcule les mêmes empreintes qu'un calcul indépendant", async () => {
    expect(delivery.notebooks.map(({ fingerprint }) => fingerprint)).toEqual(
      await independentFingerprints(path),
    );
  });

  it(
    "donne les mêmes empreintes au même contenu rezippé à une autre date",
    { timeout: 60_000 },
    async () => {
      const later = new Date("2026-12-01T17:45:00Z");
      const again = await writeDelivery(
        healthySpec(later),
        join(dir.path, "rezip"),
      );
      const [first, second] = await Promise.all([
        readFile(path),
        readFile(again),
      ]);
      expect(first.equals(second)).toBe(false);
      const redelivered = delivered(await verifyDelivery(again));
      expect(redelivered.name).toBe("delivery-2026-12-01-1745.zip");
      expect(
        redelivered.notebooks.map(({ fingerprint }) => fingerprint),
      ).toEqual(delivery.notebooks.map(({ fingerprint }) => fingerprint));
    },
  );

  it("lit le même contenu en ZIP64", async () => {
    const records = await readArchive(await readFile(path));
    const zip64 = await zipBuffer(
      records.map(({ path: name, bytes, compressionMethod }) => ({
        name,
        bytes,
        compress: compressionMethod === 8,
      })),
      { zip64: true },
    );
    expect(zip64.includes(Buffer.from([0x50, 0x4b, 0x06, 0x06]))).toBe(true);
    const zip64Path = await dir.write("delivery-2026-11-24-0931.zip", zip64);
    const read = delivered(await verifyDelivery(zip64Path));
    expect(read.notebooks.map(({ fingerprint }) => fingerprint)).toEqual(
      delivery.notebooks.map(({ fingerprint }) => fingerprint),
    );
  });

  it("refuse un nom de dépôt hors format, en une seule erreur", async () => {
    const renamed = join(dir.path, "sain", "livraison.zip");
    await rename(path, renamed);
    const result = await verifyDelivery(renamed);
    await rename(renamed, path);
    expect(result).toEqual({
      ok: false,
      errors: [
        expect.objectContaining({
          code: "invalid-delivery-name",
          file: "livraison.zip",
        }),
      ],
    });
  });
});

describe("verifyDelivery, archive", () => {
  it("refuse un dépôt vide", async () => {
    const path = await dir.write(
      "delivery-2026-11-24-0932.zip",
      await zipBuffer([]),
    );
    expect(await verifyDelivery(path)).toEqual({
      ok: false,
      errors: [
        {
          file: "delivery-2026-11-24-0932.zip",
          code: "empty-delivery",
          message: "delivery-2026-11-24-0932.zip ne contient aucun cahier.",
        },
      ],
    });
  });

  it("refuse un ZIP tronqué", async () => {
    const zip = await zipBuffer([{ name: "CC_1.json", bytes: "{}" }]);
    const path = await dir.write(
      "delivery-2026-11-24-0933.zip",
      zip.subarray(0, 20),
    );
    const result = await verifyDelivery(path);
    expect(result.ok ? [] : result.errors.map(({ code }) => code)).toEqual([
      "unreadable-archive",
    ]);
  });
});
