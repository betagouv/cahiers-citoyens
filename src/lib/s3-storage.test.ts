import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StorageNotConfiguredError,
  createS3Client,
  parseS3Settings,
  prefixedKey,
} from "./s3-storage";

const completeEnv = {
  S3_ENDPOINT: "https://s3.example",
  S3_REGION: "region-1",
  S3_BUCKET: "bucket",
  S3_PREFIX: "fake-data/",
  S3_ACCESS_KEY_ID: "id",
  S3_SECRET_ACCESS_KEY: "secret",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("parseS3Settings", () => {
  it("lit toutes les variables", () => {
    expect(parseS3Settings(completeEnv)).toEqual({
      endpoint: "https://s3.example",
      region: "region-1",
      bucket: "bucket",
      prefix: "fake-data/",
      accessKeyId: "id",
      secretAccessKey: "secret",
    });
  });

  it("accepte un préfixe absent", () => {
    expect(
      parseS3Settings({ ...completeEnv, S3_PREFIX: undefined }).prefix,
    ).toBe("");
  });

  it("nomme les variables manquantes", () => {
    expect(() =>
      parseS3Settings({ ...completeEnv, S3_BUCKET: "", S3_REGION: undefined }),
    ).toThrow(
      new StorageNotConfiguredError(
        "variables manquantes : S3_REGION, S3_BUCKET",
      ),
    );
  });
});

describe("prefixedKey", () => {
  it("place la clé sous le préfixe, avec un seul séparateur", () => {
    expect(prefixedKey("fake-data/", "notebooks/n-1/v1/1.jpg")).toBe(
      "fake-data/notebooks/n-1/v1/1.jpg",
    );
    expect(prefixedKey("/fake-data", "/notebooks/n-1/v1/1.jpg")).toBe(
      "fake-data/notebooks/n-1/v1/1.jpg",
    );
  });

  it("laisse la clé telle quelle sans préfixe", () => {
    expect(prefixedKey("", "notebooks/n-1/v1/1.jpg")).toBe(
      "notebooks/n-1/v1/1.jpg",
    );
  });
});

describe("createS3Client", () => {
  it("vise le point d'accès en path-style, sans sommes de contrôle trailing", async () => {
    const client = createS3Client(parseS3Settings(completeEnv));

    expect(client.config.forcePathStyle).toBe(true);
    await expect(client.config.region()).resolves.toBe("region-1");
    await expect(client.config.credentials()).resolves.toMatchObject({
      accessKeyId: "id",
      secretAccessKey: "secret",
    });
    await expect(client.config.requestChecksumCalculation()).resolves.toBe(
      "WHEN_REQUIRED",
    );
    await expect(client.config.responseChecksumValidation()).resolves.toBe(
      "WHEN_REQUIRED",
    );
  });
});

async function loadStorage() {
  vi.resetModules();
  return import("./s3-storage");
}

function sendResolving(output: unknown) {
  return vi
    .spyOn(S3Client.prototype, "send")
    .mockImplementation(vi.fn().mockResolvedValue(output));
}

function sendRejecting(error: Error) {
  return vi
    .spyOn(S3Client.prototype, "send")
    .mockImplementation(vi.fn().mockRejectedValue(error));
}

describe("openObject", () => {
  it("lit le dossier local quand LOCAL_BUCKET_DIR est défini", async () => {
    vi.stubEnv("LOCAL_BUCKET_DIR", "/dossier/absent");
    const send = sendResolving({});
    const { openObject } = await loadStorage();

    await expect(
      openObject("notebooks/n-1/v1/1.jpg", AbortSignal.abort()),
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it("échoue sans configuration du stockage", async () => {
    vi.stubEnv("S3_BUCKET", "");
    const storage = await loadStorage();

    await expect(
      storage.openObject("notebooks/n-1/v1/1.jpg", AbortSignal.abort()),
    ).rejects.toThrow(storage.StorageNotConfiguredError);
  });

  it("lit l'objet sous le préfixe", async () => {
    for (const [name, value] of Object.entries(completeEnv)) {
      vi.stubEnv(name, value);
    }
    const body = new ReadableStream();
    const send = sendResolving({
      Body: { transformToWebStream: () => body },
      ContentLength: 10,
      ETag: '"etag"',
    });
    const signal = new AbortController().signal;
    const { openObject } = await loadStorage();

    await expect(openObject("notebooks/n-1/v1/1.jpg", signal)).resolves.toEqual(
      {
        body,
        contentLength: 10,
        etag: '"etag"',
      },
    );
    const [command, options] = send.mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: "bucket",
      Key: "fake-data/notebooks/n-1/v1/1.jpg",
    });
    expect(options).toEqual({ abortSignal: signal });

    await openObject("notebooks/n-2/v1/1.jpg", signal);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("renvoie undefined pour un objet absent ou sans contenu", async () => {
    for (const [name, value] of Object.entries(completeEnv)) {
      vi.stubEnv(name, value);
    }
    const { openObject } = await loadStorage();

    sendRejecting(new NoSuchKey({ message: "absent", $metadata: {} }));
    await expect(
      openObject("notebooks/n-1/v1/1.jpg", AbortSignal.abort()),
    ).resolves.toBeUndefined();

    sendResolving({ Body: undefined });
    await expect(
      openObject("notebooks/n-1/v1/1.jpg", AbortSignal.abort()),
    ).resolves.toBeUndefined();
  });

  it("propage toute autre erreur du stockage", async () => {
    for (const [name, value] of Object.entries(completeEnv)) {
      vi.stubEnv(name, value);
    }
    const { openObject } = await loadStorage();
    sendRejecting(new Error("réseau"));

    await expect(
      openObject("notebooks/n-1/v1/1.jpg", AbortSignal.abort()),
    ).rejects.toThrow("réseau");
  });
});
