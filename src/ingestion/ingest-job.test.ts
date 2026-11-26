import { describe, expect, it, vi } from "vitest";
import { openFileStorage } from "./file-bucket";
import { runIngestCommand } from "./ingest";
import { openJobStorage, runIngestJob } from "./ingest-job";
import { openS3Storage } from "./ingest-services";

vi.mock("./ingest", () => ({ runIngestCommand: vi.fn(async () => 1) }));
vi.mock("./file-bucket", () => ({ openFileStorage: vi.fn(() => "file") }));
vi.mock("./ingest-services", () => ({ openS3Storage: vi.fn(() => "s3") }));

describe("openJobStorage", () => {
  it("ouvre le bucket S3 par défaut", () => {
    const env = { S3_BUCKET: "exemple" };

    expect(openJobStorage(env)).toBe("s3");
    expect(openS3Storage).toHaveBeenCalledWith(env);
  });

  it("ouvre le dossier local quand LOCAL_BUCKET_DIR est défini", () => {
    const env = { LOCAL_BUCKET_DIR: "/tmp/bucket" };

    expect(openJobStorage(env)).toBe("file");
    expect(openFileStorage).toHaveBeenCalledWith(env);
  });
});

describe("runIngestJob", () => {
  it("lance la commande sur les sorties du processus et en renvoie le code", async () => {
    const env = { DATABASE_URL: "postgres://test/app" };

    await expect(runIngestJob(["run"], env)).resolves.toBe(1);

    const [[args, ctx]] = vi.mocked(runIngestCommand).mock.calls;
    expect(args).toEqual(["run"]);
    expect(ctx.env).toBe(env);
    expect(ctx.openStorage).toBe(openJobStorage);
    expect(ctx.now()).toBeInstanceOf(Date);
    expect(ctx.print).toBe(console.log);
    expect(ctx.log).toBe(console.error);
  });
});
