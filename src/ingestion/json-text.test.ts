import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { JSON_SIZE_LIMIT, readJsonText } from "./json-text";

function stream(...chunks: (string | Buffer)[]): Readable {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

describe("readJsonText", () => {
  it("lit un texte UTF-8 en plusieurs morceaux", async () => {
    const bytes = Buffer.from('{"commune": "Exempleville-sur-Mer é"}');
    expect(
      await readJsonText(
        stream(bytes.subarray(0, 33), bytes.subarray(33)),
        bytes.length,
      ),
    ).toEqual({ ok: true, text: '{"commune": "Exempleville-sur-Mer é"}' });
  });

  it("refuse un fichier annoncé trop gros sans le lire", async () => {
    const source = stream("{}");
    expect(await readJsonText(source, JSON_SIZE_LIMIT + 1)).toEqual({
      ok: false,
      reason: "too-large",
    });
    expect(source.destroyed).toBe(true);
    expect(JSON_SIZE_LIMIT).toBe(20 * 1024 * 1024);
  });

  it("s'arrête dès que le contenu dépasse la limite, même si la taille annoncée ment", async () => {
    expect(await readJsonText(stream("1234", "5678"), 2, 6)).toEqual({
      ok: false,
      reason: "too-large",
    });
    expect(await readJsonText(stream("1234", "56"), 2, 6)).toEqual({
      ok: true,
      text: "123456",
    });
  });

  it("refuse un texte qui n'est pas en UTF-8", async () => {
    expect(
      await readJsonText(stream(Buffer.from([0x7b, 0xe9, 0x7d])), 3),
    ).toEqual({
      ok: false,
      reason: "not-utf8",
    });
  });

  it("refuse un flux qui ne donne pas des octets", async () => {
    await expect(readJsonText(Readable.from(["{}"]), 2)).rejects.toThrow(
      "flux d'octets attendu",
    );
  });
});
