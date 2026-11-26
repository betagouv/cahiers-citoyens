import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import type { SendAlert } from "./alert";
import { claimDelivery } from "./delivery-rows";
import { createFileBucket } from "./file-bucket";
import type { ObjectStore } from "./object-store";
import { incomingNames, receiveIncoming } from "./receive-incoming";
import { type TempDir, tempDir } from "./test-zip";

vi.mock("./delivery-rows", () => ({ claimDelivery: vi.fn() }));

const db = createDatabase("postgres://test/app");
const A = "delivery-2026-11-24-0930.zip";
const B = "delivery-2026-11-25-0930.zip";

const NOW = new Date("2026-11-26T08:00:00Z");
const alert = vi.fn<SendAlert>(() => Promise.resolve());

function deps(store: ObjectStore) {
  return { db, store, alert, now: () => NOW };
}

let dir: TempDir;

beforeEach(async () => {
  dir = await tempDir("receive-");
});

afterEach(async () => {
  await dir.remove();
  vi.mocked(claimDelivery).mockReset();
  alert.mockClear();
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

    await expect(receiveIncoming(deps(store))).resolves.toEqual({
      errors: [],
      left: [],
      duplicates: [],
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

    await receiveIncoming(deps(store));

    expect(await store.list("")).toEqual([`deliveries/${A}`]);
  });

  it("refuse le renvoi d'un dépôt terminé avec un rapport à part", async () => {
    const store = await bucketWith(
      `incoming/${A}`,
      `incoming/${B}`,
      "reports/delivery-2026-11-24-0930.json",
    );
    vi.mocked(claimDelivery)
      .mockResolvedValueOnce(claimed("applied", false))
      .mockResolvedValueOnce(claimed("rejected", false));

    const result = await receiveIncoming(deps(store));

    expect(result).toEqual({ errors: [], left: [], duplicates: [A, B] });
    expect(await store.list("")).toEqual([
      "reports/delivery-2026-11-24-0930.duplicate.json",
      "reports/delivery-2026-11-24-0930.json",
      "reports/delivery-2026-11-25-0930.duplicate.json",
    ]);
    const report: unknown = JSON.parse(
      await readFile(
        join(
          dir.path,
          "bucket/reports/delivery-2026-11-24-0930.duplicate.json",
        ),
        "utf8",
      ),
    );
    expect(report).toMatchObject({
      delivery: A,
      received_at: NOW.toISOString(),
      status: "rejected",
      errors: [{ file: A, code: "duplicate-delivery-name" }],
    });
    expect(alert.mock.calls.map(([sent]) => sent.details.delivery)).toEqual([
      A,
      B,
    ]);
  });

  it("laisse dans incoming/ un dépôt qu'il n'a pas pu enregistrer", async () => {
    const store = await bucketWith(`incoming/${A}`);
    vi.mocked(claimDelivery).mockRejectedValue(new Error("base injoignable"));

    await expect(receiveIncoming(deps(store))).resolves.toEqual({
      errors: [{ scope: A, message: "base injoignable" }],
      left: [A],
      duplicates: [],
    });
    expect(await store.list("")).toEqual([`incoming/${A}`]);
  });
});
