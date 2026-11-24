import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AlbertClient } from "../albert";
import { getAlbert } from "./albert-config";
import { searchByVector, searchFullText } from "./retrieval";
import {
  CANDIDATE_COUNT,
  MAX_QUESTION_LENGTH,
  SOURCE_COUNT,
  type SearchOutcome,
  parseQuestion,
  searchNotebooks,
} from "./search";

vi.mock("./retrieval", () => ({
  searchFullText: vi.fn(),
  searchByVector: vi.fn(),
}));
vi.mock("./albert-config", () => ({
  getAlbert: vi.fn(),
  chatModelName: () => "modele-test",
}));

const QUESTION = "plus de médecin";
const VECTOR = [0.1, 0.2];

function passage(id: number) {
  return { id, notebookId: `notebook-${id}`, content: `Passage ${id}` };
}

function fakeAlbert() {
  const albert = {
    embed: vi.fn<AlbertClient["embed"]>().mockResolvedValue([VECTOR]),
    rerank: vi.fn<AlbertClient["rerank"]>().mockResolvedValue([]),
    chat: vi.fn<AlbertClient["chat"]>().mockResolvedValue("Réponse [1]."),
  };
  vi.mocked(getAlbert).mockReturnValue(albert);
  return albert;
}

function sourcesOnly(outcome: SearchOutcome) {
  if (outcome.status !== "sources-only") {
    throw new Error(`statut ${outcome.status} au lieu de sources-only`);
  }
  return outcome;
}

beforeEach(() => {
  vi.mocked(getAlbert).mockReturnValue(undefined);
  vi.mocked(searchFullText).mockResolvedValue([]);
  vi.mocked(searchByVector).mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseQuestion", () => {
  it("normalise les espaces", () => {
    expect(parseQuestion("  plus de   médecin\n au village ")).toBe(
      "plus de médecin au village",
    );
    expect(parseQuestion(["a", "b"])).toBe("a");
  });

  it("renvoie une chaîne vide sans question", () => {
    expect(parseQuestion(undefined)).toBe("");
    expect(parseQuestion("   ")).toBe("");
  });

  it("borne la longueur", () => {
    expect(parseQuestion("x".repeat(2000))).toHaveLength(MAX_QUESTION_LENGTH);
  });
});

describe("searchNotebooks", () => {
  it("rédige une réponse à partir des passages reclassés, numérotés", async () => {
    const albert = fakeAlbert();
    albert.rerank.mockResolvedValue([
      { index: 1, relevanceScore: 0.9 },
      { index: 0, relevanceScore: 0.5 },
      { index: 2, relevanceScore: 0.001 },
    ]);
    vi.mocked(searchFullText).mockResolvedValue([passage(1), passage(2)]);
    vi.mocked(searchByVector).mockResolvedValue([passage(3), passage(1)]);

    const outcome = await searchNotebooks(QUESTION);

    expect(outcome).toEqual({
      status: "answered",
      answer: "Réponse [1].",
      chatModel: "modele-test",
      sources: [
        { ...passage(3), number: 1 },
        { ...passage(1), number: 2 },
      ],
      notices: [],
    });
    expect(albert.embed).toHaveBeenCalledWith([QUESTION]);
    expect(searchFullText).toHaveBeenCalledWith(QUESTION, CANDIDATE_COUNT);
    expect(searchByVector).toHaveBeenCalledWith(VECTOR, CANDIDATE_COUNT);
    expect(albert.rerank).toHaveBeenCalledWith(
      QUESTION,
      ["Passage 1", "Passage 3", "Passage 2"],
      SOURCE_COUNT,
    );
    const [messages] = albert.chat.mock.calls[0];
    expect(messages[1].content).toContain("[1] (cahier notebook-3)");
    expect(messages[1].content).toContain("[2] (cahier notebook-1)");
  });

  it("sans Albert, cherche les mots seuls et renvoie les sources", async () => {
    vi.mocked(searchFullText).mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => passage(i + 1)),
    );

    const outcome = sourcesOnly(await searchNotebooks(QUESTION));

    expect(searchByVector).not.toHaveBeenCalled();
    expect(outcome.reason).toBe(
      "La réponse rédigée n'est pas disponible pour le moment. Voici les passages les plus proches de votre question.",
    );
    expect(outcome.notices).toEqual([
      "La recherche par le sens n'est pas configurée : seuls les mots de la question ont été cherchés.",
    ]);
    expect(outcome.sources).toEqual(
      [1, 2, 3, 4, 5].map((id) => ({ ...passage(id), number: id })),
    );
  });

  it("se replie sur le plein texte si l'embedding échoue", async () => {
    const albert = fakeAlbert();
    albert.embed.mockRejectedValue(new Error("x"));
    vi.mocked(searchFullText).mockResolvedValue([passage(1)]);

    const outcome = sourcesOnly(await searchNotebooks(QUESTION));

    expect(searchByVector).not.toHaveBeenCalled();
    expect(albert.rerank).not.toHaveBeenCalled();
    expect(albert.chat).not.toHaveBeenCalled();
    expect(outcome.notices).toEqual([
      "La recherche par le sens est momentanément indisponible : seuls les mots de la question ont été cherchés.",
    ]);
    expect(console.error).toHaveBeenCalledWith(
      "Recherche : embedding en échec",
      expect.any(Error),
    );
  });

  it("ne trouve rien sans aucun candidat", async () => {
    fakeAlbert();

    await expect(searchNotebooks(QUESTION)).resolves.toEqual({
      status: "no-results",
      notices: [],
    });
  });

  it("ne trouve rien quand aucun passage n'atteint le seuil de pertinence", async () => {
    const albert = fakeAlbert();
    albert.rerank.mockResolvedValue([{ index: 0, relevanceScore: 0.0005 }]);
    vi.mocked(searchByVector).mockResolvedValue([passage(1)]);

    await expect(searchNotebooks(QUESTION)).resolves.toEqual({
      status: "no-results",
      notices: [],
    });
    expect(albert.chat).not.toHaveBeenCalled();
  });

  it("garde l'ordre de la recherche si le reclassement échoue", async () => {
    const albert = fakeAlbert();
    albert.rerank.mockRejectedValue(new Error("x"));
    vi.mocked(searchFullText).mockResolvedValue([passage(2), passage(1)]);

    await expect(searchNotebooks(QUESTION)).resolves.toEqual({
      status: "answered",
      answer: "Réponse [1].",
      chatModel: "modele-test",
      sources: [
        { ...passage(2), number: 1 },
        { ...passage(1), number: 2 },
      ],
      notices: [
        "Le reclassement des passages est momentanément indisponible : ils sont présentés dans l'ordre de la recherche.",
      ],
    });
  });

  it("renvoie les sources sans réponse si la rédaction échoue", async () => {
    const albert = fakeAlbert();
    albert.rerank.mockResolvedValue([{ index: 0, relevanceScore: 0.8 }]);
    albert.chat.mockRejectedValue(new Error("x"));
    vi.mocked(searchFullText).mockResolvedValue([passage(1)]);

    const outcome = sourcesOnly(await searchNotebooks(QUESTION));

    expect(outcome.reason).toBe(
      "Le service de rédaction des réponses est momentanément indisponible. Voici les passages les plus proches de votre question.",
    );
    expect(outcome.sources).toEqual([{ ...passage(1), number: 1 }]);
    expect(console.error).toHaveBeenCalledWith(
      "Recherche : génération en échec",
      expect.any(Error),
    );
  });
});
