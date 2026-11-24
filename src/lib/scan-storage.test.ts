import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StorageNotConfiguredError,
  createS3Client,
  parseByteRange,
  parseS3Settings,
  prefixedKey,
} from "./scan-storage";

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
    expect(prefixedKey("fake-data/", "notebooks/n-1/scan.pdf")).toBe(
      "fake-data/notebooks/n-1/scan.pdf",
    );
    expect(prefixedKey("/fake-data", "/notebooks/n-1/scan.pdf")).toBe(
      "fake-data/notebooks/n-1/scan.pdf",
    );
  });

  it("laisse la clé telle quelle sans préfixe", () => {
    expect(prefixedKey("", "notebooks/n-1/scan.pdf")).toBe(
      "notebooks/n-1/scan.pdf",
    );
  });
});

describe("parseByteRange", () => {
  it("relaie une plage simple", () => {
    expect(parseByteRange("bytes=0-1023")).toBe("bytes=0-1023");
    expect(parseByteRange("bytes=1024-")).toBe("bytes=1024-");
    expect(parseByteRange("bytes=-500")).toBe("bytes=-500");
  });

  it("ignore l'absence d'en-tête, les plages multiples et le reste", () => {
    expect(parseByteRange(null)).toBeUndefined();
    expect(parseByteRange("bytes=0-1,5-9")).toBeUndefined();
    expect(parseByteRange("items=0-1")).toBeUndefined();
    expect(parseByteRange("bytes=-")).toBeUndefined();
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
  return import("./scan-storage");
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

describe("openScan", () => {
  it("échoue sans configuration du stockage", async () => {
    vi.stubEnv("S3_BUCKET", "");
    const storage = await loadStorage();

    await expect(
      storage.openScan(
        "notebooks/n-1/scan.pdf",
        undefined,
        AbortSignal.abort(),
      ),
    ).rejects.toThrow(storage.StorageNotConfiguredError);
  });

  it("lit l'objet sous le préfixe, avec la plage demandée", async () => {
    for (const [name, value] of Object.entries(completeEnv)) {
      vi.stubEnv(name, value);
    }
    const body = new ReadableStream();
    const send = sendResolving({
      Body: { transformToWebStream: () => body },
      ContentLength: 10,
      ContentRange: "bytes 0-9/100",
      ETag: '"etag"',
    });
    const signal = new AbortController().signal;
    const { openScan } = await loadStorage();

    await expect(
      openScan("notebooks/n-1/scan.pdf", "bytes=0-9", signal),
    ).resolves.toEqual({
      body,
      contentLength: 10,
      contentRange: "bytes 0-9/100",
      etag: '"etag"',
    });
    const [command, options] = send.mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: "bucket",
      Key: "fake-data/notebooks/n-1/scan.pdf",
      Range: "bytes=0-9",
    });
    expect(options).toEqual({ abortSignal: signal });

    await openScan("notebooks/n-2/scan.pdf", undefined, signal);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("renvoie undefined pour un objet absent ou sans contenu", async () => {
    for (const [name, value] of Object.entries(completeEnv)) {
      vi.stubEnv(name, value);
    }
    const { openScan } = await loadStorage();

    sendRejecting(new NoSuchKey({ message: "absent", $metadata: {} }));
    await expect(
      openScan("notebooks/n-1/scan.pdf", undefined, AbortSignal.abort()),
    ).resolves.toBeUndefined();

    sendResolving({ Body: undefined });
    await expect(
      openScan("notebooks/n-1/scan.pdf", undefined, AbortSignal.abort()),
    ).resolves.toBeUndefined();
  });

  it("propage toute autre erreur du stockage", async () => {
    for (const [name, value] of Object.entries(completeEnv)) {
      vi.stubEnv(name, value);
    }
    const { openScan } = await loadStorage();
    sendRejecting(new Error("réseau"));

    await expect(
      openScan("notebooks/n-1/scan.pdf", undefined, AbortSignal.abort()),
    ).rejects.toThrow("réseau");
  });
});
