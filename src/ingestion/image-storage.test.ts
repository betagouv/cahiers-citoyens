import { Readable } from "node:stream";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { type CommandSender, createS3ImageStorage } from "./image-storage";

const SETTINGS = {
  endpoint: "https://s3.example",
  region: "region-1",
  bucket: "bucket",
  prefix: "site/",
  accessKeyId: "id",
  secretAccessKey: "secret",
};

describe("createS3ImageStorage", () => {
  it("envoie l'image en flux sous la clé préfixée, avec son type et sa taille", async () => {
    const send = vi.fn<CommandSender["send"]>(() => Promise.resolve({}));
    const body = Readable.from([Buffer.from("png")]);

    await createS3ImageStorage(SETTINGS, { send }).put({
      key: "notebooks/a/v1/1.png",
      body,
      contentType: "image/png",
      contentLength: 3,
    });

    const [[command]] = send.mock.calls;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: "bucket",
      Key: "site/notebooks/a/v1/1.png",
      Body: body,
      ContentType: "image/png",
      ContentLength: 3,
    });
  });

  it("supprime un objet à la fois", async () => {
    const send = vi.fn<CommandSender["send"]>(() => Promise.resolve({}));

    await createS3ImageStorage(SETTINGS, { send }).remove(
      "notebooks/a/v1/1.png",
    );

    const [[command]] = send.mock.calls;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: "bucket",
      Key: "site/notebooks/a/v1/1.png",
    });
  });

  it("crée par défaut un client S3 configuré comme pour les scans", () => {
    expect(() => createS3ImageStorage(SETTINGS)).not.toThrow();
  });
});
