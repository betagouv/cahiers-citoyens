import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type S3Sender, createS3ObjectStore } from "./object-store";
import { type TempDir, tempDir } from "./test-zip";

const SETTINGS = {
  endpoint: "https://s3.example",
  region: "region-1",
  bucket: "bucket",
  prefix: "site/",
  accessKeyId: "id",
  secretAccessKey: "secret",
};

function sender(...outputs: unknown[]) {
  return vi.fn<S3Sender["send"]>(() => Promise.resolve(outputs.shift() ?? {}));
}

let dir: TempDir;

beforeAll(async () => {
  dir = await tempDir("object-store-");
});

afterAll(async () => {
  await dir.remove();
});

describe("createS3ObjectStore", () => {
  it("liste les clés sous le préfixe, page après page, relatives au préfixe du bucket", async () => {
    const send = sender(
      {
        Contents: [{ Key: "site/incoming/a.zip" }, { Size: 1 }],
        IsTruncated: true,
        NextContinuationToken: "t1",
      },
      { Contents: [{ Key: "site/incoming/b.zip" }], IsTruncated: false },
    );

    await expect(
      createS3ObjectStore(SETTINGS, { send }).list("incoming/"),
    ).resolves.toEqual(["incoming/a.zip", "incoming/b.zip"]);
    const inputs = send.mock.calls.map(([command]) => {
      expect(command).toBeInstanceOf(ListObjectsV2Command);
      return command.input;
    });
    expect(inputs).toEqual([
      {
        Bucket: "bucket",
        Prefix: "site/incoming/",
        ContinuationToken: undefined,
      },
      { Bucket: "bucket", Prefix: "site/incoming/", ContinuationToken: "t1" },
    ]);
  });

  it("lit une liste vide et refuse une réponse qui n'est pas un objet", async () => {
    const store = createS3ObjectStore(
      { ...SETTINGS, prefix: "" },
      { send: sender({ IsTruncated: true }, "?") },
    );

    await expect(store.list("incoming/")).resolves.toEqual([]);
    await expect(store.list("incoming/")).rejects.toThrow(
      "Réponse de liste S3 invalide",
    );
  });

  it("copie un objet avec une source encodée, puis le supprime", async () => {
    const send = sender();
    const store = createS3ObjectStore(SETTINGS, { send });

    await store.copy("incoming/a b.zip", "deliveries/a b.zip");
    await store.remove("incoming/a b.zip");

    const [[copy], [remove]] = send.mock.calls;
    expect(copy).toBeInstanceOf(CopyObjectCommand);
    expect(copy.input).toEqual({
      Bucket: "bucket",
      CopySource: "bucket/site/incoming/a%20b.zip",
      Key: "site/deliveries/a b.zip",
    });
    expect(remove).toBeInstanceOf(DeleteObjectCommand);
    expect(remove.input).toEqual({
      Bucket: "bucket",
      Key: "site/incoming/a b.zip",
    });
  });

  it("télécharge un objet en flux dans un fichier", async () => {
    const send = sender({ Body: Readable.from([Buffer.from("zip")]) });
    const path = join(dir.path, "a.zip");

    await createS3ObjectStore(SETTINGS, { send }).download(
      "deliveries/a.zip",
      path,
    );

    expect(await readFile(path, "utf8")).toBe("zip");
    const [[command]] = send.mock.calls;
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: "bucket",
      Key: "site/deliveries/a.zip",
    });
  });

  it("refuse un objet sans contenu lisible", async () => {
    const store = createS3ObjectStore(SETTINGS, { send: sender({}, null) });

    for (let i = 0; i < 2; i++) {
      await expect(
        store.download("deliveries/a.zip", join(dir.path, "b.zip")),
      ).rejects.toThrow("Objet S3 sans contenu lisible : deliveries/a.zip");
    }
  });

  it("lit la date de modification d'un objet", async () => {
    const date = new Date("2026-11-24T09:30:00Z");
    const send = sender({ LastModified: date }, {});
    const store = createS3ObjectStore(SETTINGS, { send });

    await expect(store.modifiedAt("incoming/a.zip")).resolves.toBe(date);
    await expect(store.modifiedAt("incoming/a.zip")).rejects.toThrow(
      "Objet S3 sans date de modification : incoming/a.zip",
    );
    const [[command]] = send.mock.calls;
    expect(command).toBeInstanceOf(HeadObjectCommand);
    expect(command.input).toEqual({
      Bucket: "bucket",
      Key: "site/incoming/a.zip",
    });
  });

  it("écrit un document JSON", async () => {
    const send = sender();

    await createS3ObjectStore(SETTINGS, { send }).writeJson(
      "reports/a.json",
      "{}",
    );

    const [[command]] = send.mock.calls;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: "bucket",
      Key: "site/reports/a.json",
      Body: "{}",
      ContentType: "application/json",
    });
  });

  it("crée par défaut un client S3 configuré comme pour les scans", () => {
    expect(() => createS3ObjectStore(SETTINGS)).not.toThrow();
  });
});
