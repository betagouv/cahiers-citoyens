import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../src/db/client";
import { createAlbertClient } from "../src/lib/albert";
import {
  formatNearestChunk,
  nearestChunks,
  parseSearchOptions,
  runSearch,
} from "./search-chunks";

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

function albertEmbedding(vector: number[]) {
  const embed = vi.fn().mockResolvedValue([vector]);
  vi.mocked(createAlbertClient).mockReturnValue({
    embed,
    rerank: vi.fn(),
    chat: vi.fn(),
  });
  return embed;
}

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
});

describe("parseSearchOptions", () => {
  it("réunit les mots de la question et lit les options", () => {
    expect(
      parseSearchOptions(["plus de", "médecin", "--limit", "3"], {
        ...ENV,
        ALBERT_BASE_URL: "https://albert.example/v1",
      }),
    ).toEqual({
      question: "plus de médecin",
      limit: 3,
      databaseUrl: "postgres://test/app",
      apiKey: "cle",
      albertBaseUrl: "https://albert.example/v1",
    });
  });

  it("renvoie 5 passages par défaut", () => {
    expect(parseSearchOptions(["question"], ENV).limit).toBe(5);
  });

  it("exige une question, puis DATABASE_URL et ALBERT_API_KEY", () => {
    expect(() => parseSearchOptions(["  "], ENV)).toThrow(
      'Usage : bun scripts/search.ts "question" [--limit 5]',
    );
    expect(() => parseSearchOptions(["q"], {})).toThrow(
      "DATABASE_URL est obligatoire",
    );
    expect(() =>
      parseSearchOptions(["q"], { DATABASE_URL: ENV.DATABASE_URL }),
    ).toThrow("ALBERT_API_KEY est obligatoire");
  });
});

describe("nearestChunks", () => {
  it("classe les chunks vectorisés par distance cosinus croissante", async () => {
    fake.reply([["0.12", "notebook-0001", "Plus de médecin."]]);

    await expect(
      nearestChunks(createDatabase(ENV.DATABASE_URL), [0.5, 0.25], 3),
    ).resolves.toEqual([
      {
        distance: "0.12",
        notebookId: "notebook-0001",
        content: "Plus de médecin.",
      },
    ]);
    const [query] = fake.queries;
    expect(query.sql).toContain('where "chunks"."embedding" is not null');
    expect(query.sql).toContain(
      'order by "chunks"."embedding" <=> $2 asc limit $3',
    );
    expect(query.params).toEqual(["[0.5,0.25]", "[0.5,0.25]", 3]);
  });
});

describe("formatNearestChunk", () => {
  it("écrit la distance, le cahier et le début du texte sur une ligne", () => {
    expect(
      formatNearestChunk({
        distance: "0.123456",
        notebookId: "notebook-0001",
        content: `Il n'y a plus\n\nde médecin ${"x".repeat(200)}`,
      }),
    ).toBe(`0.1235  notebook-0001  Il n'y a plus de médecin ${"x".repeat(95)}`);
  });
});

describe("runSearch", () => {
  it("vectorise la question, affiche les plus proches et ferme la connexion", async () => {
    const embed = albertEmbedding([0.5]);
    fake.reply([
      ["0.1", "notebook-0001", "Un."],
      ["0.2", "notebook-0002", "Deux."],
    ]);
    const log = vi.fn();

    await runSearch(["médecin", "--limit", "2"], ENV, log);

    expect(createAlbertClient).toHaveBeenCalledWith({
      apiKey: "cle",
      baseUrl: undefined,
    });
    expect(embed).toHaveBeenCalledWith(["médecin"]);
    expect(fake.queries[0].params).toEqual(["[0.5]", "[0.5]", 2]);
    expect(log.mock.calls).toEqual([
      ["0.1000  notebook-0001  Un."],
      ["0.2000  notebook-0002  Deux."],
    ]);
    expect(fake.ended).toBe(true);
  });

  it("ferme la connexion même en cas d'échec", async () => {
    albertEmbedding([0.5]);
    fake.reply([["0.1", "notebook-0001", "Un."]]);

    await expect(
      runSearch(["médecin"], ENV, () => {
        throw new Error("sortie fermée");
      }),
    ).rejects.toThrow("sortie fermée");
    expect(fake.ended).toBe(true);
  });

  it("écrit sur la console par défaut", async () => {
    albertEmbedding([0.5]);
    fake.reply([["0.1", "notebook-0001", "Un."]]);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await runSearch(["médecin"], ENV);

    expect(consoleLog).toHaveBeenCalledWith("0.1000  notebook-0001  Un.");
    consoleLog.mockRestore();
  });
});
