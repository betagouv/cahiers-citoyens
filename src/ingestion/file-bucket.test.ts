import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFileBucket, openFileStorage } from "./file-bucket";
import { type TempDir, tempDir } from "./test-zip";

let dir: TempDir;

beforeAll(async () => {
  dir = await tempDir("file-bucket-");
});

afterAll(async () => {
  await dir.remove();
});

describe("createFileBucket", () => {
  it("écrit, liste, copie, télécharge et supprime des clés dans un dossier", async () => {
    const bucket = createFileBucket(join(dir.path, "bucket"));
    await expect(bucket.list("incoming/")).resolves.toEqual([]);

    await bucket.put({
      key: "incoming/b.zip",
      body: Readable.from([Buffer.from("zip")]),
      contentType: "image/png",
      contentLength: 3,
    });
    await bucket.copy("incoming/b.zip", "deliveries/b.zip");
    await bucket.copy("incoming/b.zip", "incoming/a.zip");
    await bucket.remove("incoming/b.zip");
    await bucket.remove("incoming/absent.zip");

    await expect(bucket.list("incoming/")).resolves.toEqual(["incoming/a.zip"]);
    await expect(bucket.list("")).resolves.toEqual([
      "deliveries/b.zip",
      "incoming/a.zip",
    ]);
    const path = join(dir.path, "b.zip");
    await bucket.download("deliveries/b.zip", path);
    expect(await readFile(path, "utf8")).toBe("zip");
  });

  it("écrit un document JSON et lit sa date de modification", async () => {
    const bucket = createFileBucket(join(dir.path, "json"));
    const before = Date.now();

    await bucket.writeJson("reports/a.json", "{}");

    expect(await readFile(join(dir.path, "json/reports/a.json"), "utf8")).toBe(
      "{}",
    );
    const modified = await bucket.modifiedAt("reports/a.json");
    expect(modified.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("propage une autre erreur que l'absence du dossier", async () => {
    const file = await dir.write("not-a-dir", Buffer.from("x"));

    await expect(createFileBucket(file).list("")).rejects.toThrow("ENOTDIR");
  });
});

describe("openFileStorage", () => {
  it("ouvre LOCAL_BUCKET_DIR, ou data/bucket par défaut", async () => {
    const opened = openFileStorage({ LOCAL_BUCKET_DIR: join(dir.path, "env") });
    expect(opened.store).toBe(opened.images);
    await expect(opened.store.list("")).resolves.toEqual([]);
    expect(openFileStorage({}).store).toBeDefined();
  });
});
