import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../src/db/client";
import {
  loadNotebook,
  parseLoadOptions,
  parseManifest,
  parseManifestLine,
  runLoad,
} from "./load-notebooks";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../src/test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const ENV = { DATABASE_URL: "postgres://test/app" };
const HEADER = "Cahier de doléances\nCommune de Exemple (00)";

let source: string;

async function writeNotebook(id: string, transcription: string) {
  await mkdir(join(source, "notebooks", id), { recursive: true });
  await writeFile(join(source, "notebooks", id, "scan.pdf"), "%PDF");
  await writeFile(
    join(source, "notebooks", id, "transcription.txt"),
    transcription,
  );
}

function statements() {
  return fake.queries.map(({ sql }) => sql.split(" ").slice(0, 3).join(" "));
}

beforeEach(async () => {
  fake.reset();
  source = await mkdtemp(join(tmpdir(), "load-notebooks-"));
});

afterEach(async () => {
  await rm(source, { recursive: true, force: true });
});

describe("parseManifestLine", () => {
  it("lit l'id et la date d'ouverture", () => {
    expect(
      parseManifestLine(
        '{"id":"notebook-0001","openedOn":"2019-01-10","extra":1}',
        1,
      ),
    ).toEqual({ id: "notebook-0001", openedOn: "2019-01-10" });
  });

  it.each([
    ["{", "JSON invalide"],
    ["[]", "id invalide (undefined)"],
    ["3", "objet attendu"],
    ['{"id":"cahier-1","openedOn":"2019-01-10"}', "id invalide (cahier-1)"],
    [
      '{"id":"notebook-1","openedOn":"10/01/2019"}',
      "openedOn invalide (10/01/2019)",
    ],
    ['{"id":"notebook-1","openedOn":20190110}', "openedOn invalide (20190110)"],
  ])("refuse %s", (line, reason) => {
    expect(() => parseManifestLine(line, 4)).toThrow(
      `manifest.jsonl ligne 4 : ${reason}`,
    );
  });
});

describe("parseManifest", () => {
  it("ignore les lignes vides et numérote les lignes depuis 1", () => {
    const manifest =
      '{"id":"notebook-1","openedOn":"2019-01-10"}\n\n  \n{"id":"x"}\n';
    expect(() => parseManifest(manifest)).toThrow(
      "manifest.jsonl ligne 4 : id invalide (x)",
    );
    expect(parseManifest(manifest.split("\n")[0])).toEqual([
      { id: "notebook-1", openedOn: "2019-01-10" },
    ]);
  });
});

describe("parseLoadOptions", () => {
  it("lit le dossier source et DATABASE_URL", () => {
    expect(parseLoadOptions(["--source", "data/fake-data"], ENV)).toEqual({
      source: "data/fake-data",
      databaseUrl: "postgres://test/app",
    });
  });

  it("exige --source puis DATABASE_URL", () => {
    expect(() => parseLoadOptions([], ENV)).toThrow(
      "--source est obligatoire (ex. --source data/fake-data)",
    );
    expect(() => parseLoadOptions(["--source", "d"], {})).toThrow(
      "DATABASE_URL est obligatoire",
    );
  });
});

describe("loadNotebook", () => {
  it("met à jour le cahier et remplace ses chunks dans une transaction", async () => {
    await writeNotebook(
      "notebook-0001",
      `${HEADER}\n\nPremière contribution.\n\nSeconde contribution.\n`,
    );

    const count = await loadNotebook(createDatabase(ENV.DATABASE_URL), source, {
      id: "notebook-0001",
      openedOn: "2019-01-10",
    });

    expect(count).toBe(2);
    expect(statements()).toEqual([
      "begin",
      'insert into "notebooks"',
      'delete from "chunks"',
      'insert into "chunks"',
      "commit",
    ]);
    const [, upsert, remove, insert] = fake.queries;
    expect(upsert.sql).toContain('on conflict ("id") do update set');
    expect(upsert.sql).toContain('"imported_at" = now()');
    expect(upsert.params).toContain("notebooks/notebook-0001/scan.pdf");
    expect(upsert.params).toContain(
      "notebooks/notebook-0001/transcription.txt",
    );
    expect(remove.params).toEqual(["notebook-0001"]);
    expect(insert.params).toEqual([
      "notebook-0001",
      1,
      "Première contribution.",
      "notebook-0001",
      2,
      "Seconde contribution.",
    ]);
  });

  it("n'insère aucun chunk pour un cahier sans contribution", async () => {
    await writeNotebook("notebook-0002", `${HEADER}\n`);

    const count = await loadNotebook(createDatabase(ENV.DATABASE_URL), source, {
      id: "notebook-0002",
      openedOn: "2019-01-10",
    });

    expect(count).toBe(0);
    expect(statements()).toEqual([
      "begin",
      'insert into "notebooks"',
      'delete from "chunks"',
      "commit",
    ]);
  });

  it("échoue avant toute écriture si le scan manque", async () => {
    await writeNotebook("notebook-0003", `${HEADER}\n\nTexte.\n`);
    await rm(join(source, "notebooks", "notebook-0003", "scan.pdf"));

    await expect(
      loadNotebook(createDatabase(ENV.DATABASE_URL), source, {
        id: "notebook-0003",
        openedOn: "2019-01-10",
      }),
    ).rejects.toThrow("ENOENT");
    expect(fake.queries).toEqual([]);
  });
});

describe("runLoad", () => {
  it("charge chaque cahier du manifeste puis ferme la connexion", async () => {
    await writeFile(
      join(source, "manifest.jsonl"),
      '{"id":"notebook-0001","openedOn":"2019-01-10"}\n{"id":"notebook-0002","openedOn":"2019-02-01"}\n',
    );
    await writeNotebook("notebook-0001", `${HEADER}\n\nUn.\n\nDeux.\n`);
    await writeNotebook("notebook-0002", `${HEADER}\n\nTrois.\n`);
    const log = vi.fn();

    await runLoad(["--source", source], ENV, log);

    expect(fake.urls).toEqual(["postgres://test/app"]);
    expect(log).toHaveBeenCalledWith(
      `2 cahiers et 3 chunks chargés depuis ${source}`,
    );
    expect(fake.ended).toBe(true);
  });

  it("ferme la connexion même en cas d'échec", async () => {
    await writeFile(
      join(source, "manifest.jsonl"),
      '{"id":"notebook-0009","openedOn":"2019-01-10"}\n',
    );
    const consoleLog = vi.spyOn(console, "log");

    await expect(runLoad(["--source", source], ENV)).rejects.toThrow("ENOENT");
    expect(fake.ended).toBe(true);
    expect(consoleLog).not.toHaveBeenCalled();
  });

  it("écrit sur la console par défaut", async () => {
    await writeFile(join(source, "manifest.jsonl"), "");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await runLoad(["--source", source], ENV);

    expect(consoleLog).toHaveBeenCalledWith(
      `0 cahiers et 0 chunks chargés depuis ${source}`,
    );
    consoleLog.mockRestore();
  });
});
