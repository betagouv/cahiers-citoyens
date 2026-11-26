import * as crypto from "node:crypto";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { digestImage, IMAGE_HEADER_LIMIT } from "./image-digest";
import { jpegBytes, pngBytes } from "./test-images";

vi.mock("node:crypto", { spy: true });

function chunked(bytes: Uint8Array, size: number): Readable {
  const chunks: Buffer[] = [];
  for (let at = 0; at < bytes.length; at += size) {
    chunks.push(Buffer.from(bytes.subarray(at, at + size)));
  }
  return Readable.from(chunks);
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

describe("digestImage", () => {
  it("hache l'image en flux et lit son en-tête à cheval sur plusieurs morceaux", async () => {
    const image = new Uint8Array([
      ...jpegBytes(2484, 3507, 0xc2),
      ...new Uint8Array(5000),
    ]);
    expect(await digestImage(chunked(image, 3))).toEqual({
      sha256: sha256(image),
      bytes: image.length,
      header: { type: "jpeg", width: 2484, height: 3507 },
    });
  });

  it("ne garde que les premiers octets", async () => {
    const image = pngBytes(10, 20);
    expect((await digestImage(chunked(image, 7), 16)).header).toBeNull();
    expect((await digestImage(chunked(image, 7), 24)).header).toEqual({
      type: "png",
      width: 10,
      height: 20,
    });
    expect(IMAGE_HEADER_LIMIT).toBe(1024 * 1024);
  });

  it("signale un contenu qui n'est pas une image", async () => {
    const text = new TextEncoder().encode("Ceci n'est pas une image.\n");
    expect(await digestImage(chunked(text, 100))).toEqual({
      sha256: sha256(text),
      bytes: text.length,
      header: null,
    });
  });

  it("refuse un flux qui ne donne pas des octets", async () => {
    await expect(digestImage(Readable.from(["texte"]))).rejects.toThrow(
      "flux d'octets attendu",
    );
  });

  it("échoue si le hachage ne donne pas un SHA-256", async () => {
    const actual = await vi.importActual<typeof crypto>("node:crypto");
    vi.mocked(crypto.createHash).mockImplementationOnce(() =>
      actual.createHash("md5"),
    );
    await expect(digestImage(chunked(pngBytes(1, 1), 8))).rejects.toThrow(
      /^SHA-256 inattendu : [0-9a-f]{32}$/,
    );
  });
});
