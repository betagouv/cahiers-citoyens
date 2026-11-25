import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createByteReplacer } from "./replace-bytes";

async function run(
  chunks: string[],
  replacements: [string, string][],
): Promise<string> {
  const replacer = createByteReplacer();
  const encoder = new TextEncoder();
  for (const [from, to] of replacements) {
    replacer.add(encoder.encode(from), encoder.encode(to));
  }
  const output: Buffer[] = [];
  const stream = Readable.from(chunks.map((chunk) => Buffer.from(chunk))).pipe(
    replacer.stream,
  );
  for await (const chunk of stream) {
    if (Buffer.isBuffer(chunk)) output.push(chunk);
  }
  return Buffer.concat(output).toString();
}

describe("createByteReplacer", () => {
  it("laisse passer le flux tel quel sans remplacement", async () => {
    expect(await run(["abc", "def"], [])).toBe("abcdef");
  });

  it("remplace chaque occurrence, même à cheval sur deux morceaux", async () => {
    expect(
      await run(["xx__/a", "b__/a", "b", "_", "_/ab"], [["__/ab", "../ab"]]),
    ).toBe("xx../ab../ab../ab");
  });

  it("rend un flux plus court que le motif", async () => {
    expect(await run(["a"], [["abc", "xyz"]])).toBe("a");
  });

  it("refuse un remplacement de longueur différente", () => {
    expect(() =>
      createByteReplacer().add(new Uint8Array(2), new Uint8Array(3)),
    ).toThrow("longueur");
  });
});
