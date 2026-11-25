import { afterEach, describe, expect, it } from "vitest";
import { archiveBytes } from "./archive-bytes";
import type { ArchiveEntry } from "./notebook-draft";
import { readArchive } from "./read-archive";
import { utcAsLocal } from "./write-archive";

const AT = new Date("2026-11-24T09:30:00Z");
const ENTRIES: ArchiveEntry[] = [
  {
    path: "notebooks/CC_1/notebook.json",
    bytes: new TextEncoder().encode('{"format":1,"text":"aaaaaaaaaaaaaaaa"}'),
    compress: true,
  },
  {
    path: "notebooks/CC_1/0001.png",
    bytes: new Uint8Array(64).fill(7),
    compress: false,
  },
];
const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("utcAsLocal", () => {
  it("porte en heure locale les champs UTC de la date", () => {
    const local = utcAsLocal(AT);
    expect([
      local.getFullYear(),
      local.getMonth(),
      local.getDate(),
      local.getHours(),
      local.getMinutes(),
    ]).toEqual([2026, 10, 24, 9, 30]);
  });
});

describe("writeArchive", () => {
  it("stocke les PNG, compresse le JSON, restitue les octets", async () => {
    const records = await readArchive(await archiveBytes(ENTRIES, AT));
    expect(
      records.map(({ path, compressionMethod }) => [path, compressionMethod]),
    ).toEqual([
      ["notebooks/CC_1/notebook.json", 8],
      ["notebooks/CC_1/0001.png", 0],
    ]);
    records.forEach((record, i) =>
      expect(Buffer.from(ENTRIES[i].bytes).equals(record.bytes)).toBe(true),
    );
  });

  it("date chaque fichier de l'heure UTC du dépôt, quel que soit le fuseau", async () => {
    process.env.TZ = "UTC";
    const utc = await archiveBytes(ENTRIES, AT);
    process.env.TZ = "America/New_York";
    const newYork = await archiveBytes(ENTRIES, AT);
    expect(newYork.equals(utc)).toBe(true);
    const [record] = await readArchive(utc);
    expect(record.dosDate).toBe(24 | (11 << 5) | ((2026 - 1980) << 9));
    expect(record.dosTime).toBe((30 << 5) | (9 << 11));
  });

  it("donne les mêmes octets pour les mêmes entrées, d'autres pour une autre date", async () => {
    const a = await archiveBytes(ENTRIES, AT);
    expect((await archiveBytes(ENTRIES, AT)).equals(a)).toBe(true);
    expect(
      (await archiveBytes(ENTRIES, new Date("2026-11-24T10:00:00Z"))).equals(a),
    ).toBe(false);
  });

  it("écrit tel quel un nom qui remonte avec `..`", async () => {
    const records = await readArchive(
      await archiveBytes(
        [
          ...ENTRIES,
          {
            path: "notebooks/CC_1/../../../escape.txt",
            bytes: new TextEncoder().encode("x"),
            compress: true,
          },
        ],
        AT,
      ),
    );
    expect(records.map(({ path }) => path)).toContain(
      "notebooks/CC_1/../../../escape.txt",
    );
    expect(records.map(({ path }) => path).join()).not.toContain("__");
  });
});
