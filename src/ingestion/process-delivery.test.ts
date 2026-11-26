import { access } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { applyDelivery } from "./apply-delivery";
import {
  type DeliveryRow,
  MAX_ATTEMPTS,
  beginAttempt,
  markApplying,
  markRejected,
  moveDelivery,
  readDeliveryStatus,
} from "./delivery-rows";
import { createFileBucket } from "./file-bucket";
import { processDelivery } from "./process-delivery";
import { exampleDeliveryZip } from "./test-delivery";
import { type TempDir, tempDir } from "./test-zip";

vi.mock("./apply-delivery", () => ({ applyDelivery: vi.fn() }));
vi.mock("./delivery-rows", async (importOriginal) => ({
  MAX_ATTEMPTS: (await importOriginal<typeof import("./delivery-rows")>())
    .MAX_ATTEMPTS,
  beginAttempt: vi.fn(),
  markApplying: vi.fn(),
  markRejected: vi.fn(),
  moveDelivery: vi.fn(),
  readDeliveryStatus: vi.fn(),
}));

const NAME = "delivery-2026-11-24-0930.zip";
const db = createDatabase("postgres://test/app");
const images = { put: vi.fn(), remove: vi.fn() };
const row: DeliveryRow = { id: 7, name: NAME, status: "received", attempts: 0 };

let dir: TempDir;

async function depsWith(zip: Buffer | undefined) {
  const store = createFileBucket(join(dir.path, "bucket"));
  if (zip !== undefined) {
    await store.put({
      key: `deliveries/${NAME}`,
      body: Readable.from([zip]),
      contentType: "image/png",
      contentLength: zip.length,
    });
  }
  return { db, store, images, log: vi.fn() };
}

beforeEach(async () => {
  dir = await tempDir("process-");
  vi.mocked(beginAttempt).mockResolvedValue("verifying");
});

afterEach(async () => {
  await dir.remove();
  vi.clearAllMocks();
});

describe("processDelivery", () => {
  it("vérifie puis applique le ZIP téléchargé, et supprime le fichier temporaire", async () => {
    const deps = await depsWith(await exampleDeliveryZip());

    await expect(processDelivery(deps, row)).resolves.toEqual({
      move: { name: NAME, from: "received", to: "applied" },
      errors: [],
    });
    expect(markApplying).toHaveBeenCalledWith(db, row);
    const [[applyDeps, delivery]] = vi.mocked(applyDelivery).mock.calls;
    expect(applyDeps).toEqual({ db, storage: images, log: deps.log });
    expect(delivery.id).toBe(7);
    expect(delivery.verified.notebooks).toHaveLength(1);
    expect(delivery.zipPath.endsWith(`/${NAME}`)).toBe(true);
    await expect(access(delivery.zipPath)).rejects.toThrow("ENOENT");
  });

  it("reprend sans transition un dépôt laissé en applying", async () => {
    vi.mocked(beginAttempt).mockResolvedValue("applying");
    const deps = await depsWith(await exampleDeliveryZip());

    const result = await processDelivery(deps, { ...row, status: "applying" });

    expect(result.move).toEqual({
      name: NAME,
      from: "applying",
      to: "applied",
    });
    expect(markApplying).not.toHaveBeenCalled();
  });

  it("refuse un dépôt défectueux avec toutes ses erreurs", async () => {
    const deps = await depsWith(Buffer.from("pas un zip"));

    const result = await processDelivery(deps, row);

    expect(result).toEqual({
      move: { name: NAME, from: "received", to: "rejected" },
      errors: [],
    });
    const [[, , errors]] = vi.mocked(markRejected).mock.calls;
    expect(errors.map(({ code }) => code)).toEqual(["unreadable-archive"]);
    expect(applyDelivery).not.toHaveBeenCalled();
  });

  it("passe à failed sur une erreur de notre côté, avec le message", async () => {
    const deps = await depsWith(await exampleDeliveryZip());
    vi.mocked(applyDelivery).mockRejectedValue(
      new Error("stockage injoignable"),
    );
    vi.mocked(readDeliveryStatus).mockResolvedValue("applying");

    await expect(processDelivery(deps, row)).resolves.toEqual({
      move: { name: NAME, from: "received", to: "failed" },
      errors: [{ scope: NAME, message: "stockage injoignable" }],
    });
    expect(moveDelivery).toHaveBeenCalledWith(db, 7, "applying", "failed", {
      failure: "stockage injoignable",
    });
  });

  it("échoue si le ZIP manque dans deliveries/", async () => {
    vi.mocked(readDeliveryStatus).mockResolvedValue("verifying");

    const result = await processDelivery(await depsWith(undefined), row);

    expect(result.move.to).toBe("failed");
    expect(result.errors[0].message).toContain("ENOENT");
  });

  it("garde le statut final atteint avant l'erreur", async () => {
    const deps = await depsWith(await exampleDeliveryZip());
    vi.mocked(applyDelivery).mockRejectedValue(new Error("comptes"));

    for (const status of ["applied", "rejected", "failed"] as const) {
      vi.mocked(readDeliveryStatus).mockResolvedValueOnce(status);
      const result = await processDelivery(deps, row);
      expect(result.move.to).toBe(status);
    }
    expect(moveDelivery).not.toHaveBeenCalled();
  });

  it("abandonne un dépôt interrompu trop de fois", async () => {
    vi.mocked(readDeliveryStatus).mockResolvedValue("verifying");
    const stuck = {
      ...row,
      status: "verifying" as const,
      attempts: MAX_ATTEMPTS,
    };

    const result = await processDelivery(await depsWith(undefined), stuck);

    expect(result).toEqual({
      move: { name: NAME, from: "verifying", to: "failed" },
      errors: [
        {
          scope: NAME,
          message: `${NAME} abandonné après ${MAX_ATTEMPTS} tentatives interrompues`,
        },
      ],
    });
    expect(beginAttempt).not.toHaveBeenCalled();
  });

  it("rapporte aussi l'échec du passage à failed", async () => {
    vi.mocked(beginAttempt).mockRejectedValue(new Error("base injoignable"));
    vi.mocked(readDeliveryStatus).mockRejectedValue(new Error("toujours"));

    const result = await processDelivery(await depsWith(undefined), row);

    expect(result).toEqual({
      move: { name: NAME, from: "received", to: "received" },
      errors: [
        { scope: NAME, message: "base injoignable" },
        { scope: NAME, message: "toujours" },
      ],
    });
  });
});
