import { Transform } from "node:stream";

export interface ByteReplacer {
  stream: Transform;
  add(from: Uint8Array, to: Uint8Array): void;
}

// Remplace des suites d'octets de même longueur dans un flux, y compris à cheval sur
// deux morceaux : on retient les `longueur - 1` derniers octets jusqu'au morceau suivant.
export function createByteReplacer(): ByteReplacer {
  const replacements: [Buffer, Buffer][] = [];
  let pending = Buffer.alloc(0);

  function replaceAll(data: Buffer): void {
    for (const [from, to] of replacements) {
      for (
        let at = data.indexOf(from);
        at !== -1;
        at = data.indexOf(from, at + from.length)
      ) {
        to.copy(data, at);
      }
    }
  }

  const stream = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      const data = Buffer.concat([pending, chunk]);
      replaceAll(data);
      const longest = Math.max(0, ...replacements.map(([from]) => from.length));
      const keep = Math.min(Math.max(longest - 1, 0), data.length);
      pending = data.subarray(data.length - keep);
      done(null, data.subarray(0, data.length - keep));
    },
    flush(done) {
      done(null, pending);
    },
  });

  return {
    stream,
    add(from, to) {
      if (from.length !== to.length) {
        throw new Error("remplacement de longueur différente");
      }
      replacements.push([Buffer.from(from), Buffer.from(to)]);
    },
  };
}
