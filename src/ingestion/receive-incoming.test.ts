import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { claimDelivery } from "./delivery-rows";
import { createFileBucket } from "./file-bucket";
import { incomingNames, receiveIncoming } from "./receive-incoming";
import { type TempDir, tempDir } from "./test-zip";

vi.mock("./delivery-rows", () => ({ claimDelivery: vi.fn() }));

const db = createDatabase("postgres://test/app");
const A = "delivery-2026-11-24-0930.zip";
const B = "delivery-2026-11-25-0930.zip";

let dir: TempDir;

beforeEach(async () => {
  dir = await tempDir("receive-");
});

afterEach(async () => {
  await dir.remove();
  vi.mocked(claimDelivery).mockReset();
});

function claimed(
  status: "received" | "applied" | "rejected",
  created: boolean,
) {
  return { row: { id: 1, name: A, status, attempts: 0 }, created };
}

async function bucketWith(...keys: string[]) {
  const bucket = createFileBucket(join(dir.path, "bucket"));
  for (const key of keys) {
    const body = Readable.from([Buffer.from(key)]);
    await bucket.put({ key, body, contentType: "image/png", contentLength: 1 });
  }
  return bucket;
}

describe("incomingNames", () => {
  it("garde les ZIP à la racine de incoming/, par ordre de nom", () => {
    expect(
      incomingNames([
        `incoming/${B}`,
        "incoming/notes.txt",
        `incoming/sub/${A}`,
        `deliveries/${A}`,
        `incoming/${A}`,
      ]),
    ).toEqual([A, B]);
  });
});

describe("receiveIncoming", () => {
  it("enregistre chaque ZIP puis le déplace dans deliveries/", async () => {
    const store = await bucketWith(`incoming/${B}`, `incoming/${A}`);
    vi.mocked(claimDelivery).mockResolvedValue(claimed("received", true));

    await expect(receiveIncoming({ db, store })).resolves.toEqual({
      errors: [],
      left: [],
    });
    expect(vi.mocked(claimDelivery).mock.calls.map(([, name]) => name)).toEqual(
      [A, B],
    );
    expect(await store.list("")).toEqual([
      `deliveries/${A}`,
      `deliveries/${B}`,
    ]);
  });

  it("reprend le déplacement d'un dépôt déjà reçu mais encore en cours", async () => {
    const store = await bucketWith(`incoming/${A}`, `deliveries/${A}`);
    vi.mocked(claimDelivery).mockResolvedValue(claimed("received", false));

    await receiveIncoming({ db, store });

    expect(await store.list("")).toEqual([`deliveries/${A}`]);
  });

  it("supprime sans le traiter le renvoi d'un dépôt déjà terminé", async () => {
    const store = await bucketWith(`incoming/${A}`, `incoming/${B}`);
    vi.mocked(claimDelivery)
      .mockResolvedValueOnce(claimed("applied", false))
      .mockResolvedValueOnce(claimed("rejected", false));

    const result = await receiveIncoming({ db, store });

    expect(result.errors.map(({ scope }) => scope)).toEqual([A, B]);
    expect(result.errors[0].message).toBe(
      `${A} a déjà été traité (applied) : renvoi supprimé de incoming/ sans traitement. Un nouveau dépôt prend un nouvel horodatage.`,
    );
    expect(await store.list("")).toEqual([]);
  });

  it("laisse dans incoming/ un dépôt qu'il n'a pas pu enregistrer", async () => {
    const store = await bucketWith(`incoming/${A}`);
    vi.mocked(claimDelivery).mockRejectedValue(new Error("base injoignable"));

    await expect(receiveIncoming({ db, store })).resolves.toEqual({
      errors: [{ scope: A, message: "base injoignable" }],
      left: [A],
    });
    expect(await store.list("")).toEqual([`incoming/${A}`]);
  });
});
