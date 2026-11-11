import { describe, expect, it } from "vitest";
import {
  StorageNotConfiguredError,
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
