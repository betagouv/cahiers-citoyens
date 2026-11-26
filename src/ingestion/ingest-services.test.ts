import { afterEach, describe, expect, it, vi } from "vitest";
import { embedPendingChunks } from "../../scripts/embed-chunks";
import { createFileBucket } from "./file-bucket";
import { openIngestServices, openS3Storage } from "./ingest-services";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.mock("../../scripts/embed-chunks", () => ({
  embedPendingChunks: vi.fn(async () => 5),
}));

const S3_ENV = {
  S3_ENDPOINT: "https://s3.example",
  S3_REGION: "region-1",
  S3_BUCKET: "bucket",
  S3_ACCESS_KEY_ID: "id",
  S3_SECRET_ACCESS_KEY: "secret",
};
const URL = "postgres://test/app";

function fileStorage() {
  const bucket = createFileBucket("/nonexistent");
  return { store: bucket, images: bucket };
}

afterEach(() => {
  fake.reset();
  vi.clearAllMocks();
});

describe("openS3Storage", () => {
  it("ouvre le bucket des variables S3_*", () => {
    const storage = openS3Storage(S3_ENV);
    expect(Object.keys(storage.store)).toEqual([
      "list",
      "copy",
      "remove",
      "download",
    ]);
    expect(Object.keys(storage.images)).toEqual(["put", "remove"]);
  });

  it("signale les variables manquantes", () => {
    expect(() => openS3Storage({})).toThrow("variables manquantes");
  });
});

describe("openIngestServices", () => {
  it("ouvre la base, le verrou et le stockage, et vectorise avec Albert", async () => {
    const log = vi.fn();
    const services = openIngestServices(
      { DATABASE_URL: URL, ALBERT_API_KEY: "clé" },
      fileStorage,
      log,
    );

    expect(fake.urls).toEqual([URL, URL]);
    await expect(services.embedPending?.()).resolves.toBe(5);
    const [[db, albert, options, logged]] =
      vi.mocked(embedPendingChunks).mock.calls;
    expect(db).toBe(services.db);
    expect(typeof albert.embed).toBe("function");
    expect(options).toEqual({ batchSize: 32, limit: Number.MAX_SAFE_INTEGER });
    expect(logged).toBe(log);
    await services.close();
    expect(fake.ended).toBe(true);
  });

  it("ne vectorise pas sans clé Albert", () => {
    const services = openIngestServices(
      { DATABASE_URL: URL },
      fileStorage,
      vi.fn(),
    );
    expect(services.embedPending).toBeUndefined();
  });

  it("refuse une URL de base absente avant toute connexion", () => {
    expect(() => openIngestServices({}, fileStorage, vi.fn())).toThrow(
      "DATABASE_URL est obligatoire",
    );
    expect(fake.urls).toEqual([]);
  });
});
