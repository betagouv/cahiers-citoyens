import { createHash } from "node:crypto";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type Fingerprint,
  notebookFingerprint,
  parseSha256,
} from "../../src/ingestion/fingerprint";
import { parseNotebookId } from "../../src/ingestion/notebook-id";
import { parseNotebook } from "../../src/ingestion/parse-notebook";
import { archiveBytes } from "./archive-bytes";
import type { NotebookChange } from "./delivery-plan";
import { deliveryEntries } from "./delivery-entries";
import { registerFonts } from "./hands";
import { readArchive } from "./read-archive";
import { testSpec } from "./test-notebook";

function sha256(bytes: Buffer | undefined) {
  const hash = parseSha256(
    createHash("sha256")
      .update(bytes ?? "")
      .digest("hex"),
  );
  if (hash === undefined) throw new Error("SHA-256 invalide");
  return hash;
}

interface Zipped {
  zip: Buffer;
  fingerprint: Fingerprint;
}

// Ce que fera la plateforme : lire le ZIP, parser le JSON, hacher chaque image.
async function zipped(change: NotebookChange, at: string): Promise<Zipped> {
  const spec = testSpec({ change });
  const date = new Date(at);
  const zip = await archiveBytes(
    deliveryEntries({ seed: "42", createdAt: date, notebooks: [spec] }),
    date,
  );
  const files = new Map(
    (await readArchive(zip)).map(({ path, bytes }) => [path, bytes]),
  );
  const id = parseNotebookId(spec.id);
  if (!id.ok) throw new Error(id.error.message);
  const parsed = parseNotebook(id.id, String(files.get(`${spec.id}.json`)));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  const { metadata, pages } = parsed.notebook;
  const fingerprint = notebookFingerprint({
    metadata,
    pages: pages.map((page) => ({
      ...page,
      imageSha256: sha256(files.get(`${page.id}.png`)),
    })),
  });
  return { zip, fingerprint };
}

let base: Zipped;

beforeAll(async () => {
  registerFonts(join(import.meta.dirname, "fonts"));
  base = await zipped("none", "2026-11-24T09:30:00Z");
}, 30_000);

describe("empreinte d'un cahier livré", () => {
  it(
    "reste la même quand le même contenu est rezippé à une autre date",
    { timeout: 30_000 },
    async () => {
      const again = await zipped("none", "2026-12-01T17:45:00Z");
      expect(again.zip.equals(base.zip)).toBe(false);
      expect(again.fingerprint).toBe(base.fingerprint);
    },
  );

  it.each<NotebookChange>(["metadata", "text", "image"])(
    "change quand le cahier est modifié (%s)",
    { timeout: 30_000 },
    async (change) => {
      const modified = await zipped(change, "2026-11-24T09:30:00Z");
      expect(modified.fingerprint).not.toBe(base.fingerprint);
    },
  );
});
