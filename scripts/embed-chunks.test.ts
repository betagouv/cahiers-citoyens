import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../src/db/client";
import { createAlbertClient } from "../src/lib/albert";
import {
  embedPendingChunks,
  parseEmbedOptions,
  runEmbed,
} from "./embed-chunks";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../src/test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.mock("../src/lib/albert", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/albert")>()),
  createAlbertClient: vi.fn(),
}));

const ENV = { DATABASE_URL: "postgres://test/app", ALBERT_API_KEY: "cle" };

function fakeEmbed() {
  return vi.fn((texts: string[]) =>
    Promise.resolve(texts.map((_, i) => [i, 0.5])),
  );
}

function writes() {
  return fake.queries
    .filter(({ sql }) => !sql.startsWith("select"))
    .map(({ sql, params }) => (params.length > 0 ? params : sql));
}

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
});

describe("parseEmbedOptions", () => {
  it("lit les options et l'environnement", () => {
    expect(
      parseEmbedOptions(["--batch", "8", "--limit", "100"], {
        ...ENV,
        ALBERT_BASE_URL: "https://albert.example/v1",
      }),
    ).toEqual({
      batchSize: 8,
      limit: 100,
      databaseUrl: "postgres://test/app",
      apiKey: "cle",
      albertBaseUrl: "https://albert.example/v1",
    });
  });

  it("traite par lots de 32 sans limite par défaut", () => {
    expect(parseEmbedOptions([], ENV)).toMatchObject({
      batchSize: 32,
      limit: Number.MAX_SAFE_INTEGER,
      albertBaseUrl: undefined,
    });
  });

  it("exige DATABASE_URL puis ALBERT_API_KEY", () => {
    expect(() => parseEmbedOptions([], {})).toThrow(
      "DATABASE_URL est obligatoire",
    );
    expect(() =>
      parseEmbedOptions([], { DATABASE_URL: ENV.DATABASE_URL }),
    ).toThrow("ALBERT_API_KEY est obligatoire");
  });

  it("refuse une option inconnue", () => {
    expect(() => parseEmbedOptions(["--taille", "3"], ENV)).toThrow();
  });
});

describe("embedPendingChunks", () => {
  it("vectorise les chunks sans embedding par lots, dans l'ordre des id", async () => {
    fake.reply(
      [["3"]],
      [
        ["1", "un"],
        ["2", "deux"],
      ],
      [],
      [],
      [["3", "trois"]],
    );
    const embed = fakeEmbed();
    const log = vi.fn<(message: string) => void>();

    await expect(
      embedPendingChunks(
        createDatabase("postgres://test/app"),
        { embed },
        { batchSize: 2, limit: 10 },
        log,
      ),
    ).resolves.toBe(3);

    expect(embed.mock.calls).toEqual([[["un", "deux"]], [["trois"]]]);
    expect(writes()).toEqual([
      "begin",
      ["[0,0.5]", 1],
      ["[1,0.5]", 2],
      "commit",
      "begin",
      ["[0,0.5]", 3],
      "commit",
    ]);
    const batchQueries = fake.queries.filter(({ sql }) =>
      sql.startsWith('select "id", "content"'),
    );
    expect(batchQueries.map(({ params }) => params)).toEqual([[2], [1]]);
    expect(batchQueries[0].sql).toContain(
      'where "chunks"."embedding" is null order by "chunks"."id" asc',
    );
    expect(log.mock.calls.map(([message]) => message)).toEqual([
      "3 chunks sans embedding, 3 à traiter",
      "2/3",
      "3/3",
      expect.stringMatching(/^3 embeddings écrits en \d+\.\d s$/),
    ]);
  });

  it("s'arrête à la limite demandée", async () => {
    fake.reply([["50"]], [["1", "un"]]);
    const embed = fakeEmbed();
    const log = vi.fn<(message: string) => void>();

    await embedPendingChunks(
      createDatabase("postgres://test/app"),
      { embed },
      { batchSize: 32, limit: 1 },
      log,
    );

    expect(embed).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("50 chunks sans embedding, 1 à traiter");
    expect(log).toHaveBeenCalledWith("1/1");
  });

  it("s'arrête quand il ne reste plus de chunk à vectoriser", async () => {
    fake.reply([["2"]], []);
    const embed = fakeEmbed();
    const log = vi.fn<(message: string) => void>();

    await embedPendingChunks(
      createDatabase("postgres://test/app"),
      { embed },
      { batchSize: 32, limit: 10 },
      log,
    );

    expect(embed).not.toHaveBeenCalled();
    expect(log).toHaveBeenLastCalledWith(
      expect.stringMatching(/^0 embeddings écrits en/),
    );
  });
});

describe("runEmbed", () => {
  it("branche Albert et la base, puis ferme la connexion", async () => {
    vi.mocked(createAlbertClient).mockReturnValue({
      embed: fakeEmbed(),
      rerank: vi.fn(),
      chat: vi.fn(),
    });
    fake.reply([["0"]]);
    const log = vi.fn<(message: string) => void>();

    await runEmbed(["--batch", "4"], ENV, log);

    expect(createAlbertClient).toHaveBeenCalledWith({
      apiKey: "cle",
      baseUrl: undefined,
    });
    expect(fake.urls).toEqual(["postgres://test/app"]);
    expect(log).toHaveBeenCalledWith("0 chunks sans embedding, 0 à traiter");
    expect(fake.ended).toBe(true);
  });

  it("ferme la connexion même en cas d'échec", async () => {
    vi.mocked(createAlbertClient).mockReturnValue({
      embed: vi.fn().mockRejectedValue(new Error("Albert en panne")),
      rerank: vi.fn(),
      chat: vi.fn(),
    });
    fake.reply([["1"]], [["1", "un"]]);

    await expect(runEmbed([], ENV, vi.fn())).rejects.toThrow("Albert en panne");
    expect(fake.ended).toBe(true);
  });

  it("écrit sur la console par défaut", async () => {
    vi.mocked(createAlbertClient).mockReturnValue({
      embed: fakeEmbed(),
      rerank: vi.fn(),
      chat: vi.fn(),
    });
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    fake.reply([["0"]]);

    await runEmbed([], ENV);

    expect(consoleLog).toHaveBeenCalledWith(
      "0 chunks sans embedding, 0 à traiter",
    );
    consoleLog.mockRestore();
  });
});
