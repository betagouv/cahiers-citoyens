import { beforeEach, expect, it, vi } from "vitest";
import { suggestWords } from "@/lib/page-search/suggest-words";
import { GET } from "./route";

vi.mock("@/lib/page-search/suggest-words", () => ({ suggestWords: vi.fn() }));

beforeEach(() => {
  vi.mocked(suggestWords).mockReset();
  vi.mocked(suggestWords).mockResolvedValue([
    { word: "retraite", pageCount: 7 },
  ]);
});

function get(query: string) {
  return GET(new Request(`http://localhost/api/suggestions/words?${query}`));
}

it("cherche les mots d'une commune", async () => {
  const response = await get("q=retr&place=71106");

  expect(suggestWords).toHaveBeenCalledWith("retr", {
    kind: "municipality",
    code: "71106",
  });
  await expect(response.json()).resolves.toEqual({
    suggestions: [{ word: "retraite", pageCount: 7 }],
  });
});

it("cherche dans toute la France sans lieu", async () => {
  await get("q=retr");

  expect(suggestWords).toHaveBeenCalledWith("retr", undefined);
});

it("refuse un lieu invalide", async () => {
  const response = await get("q=retr&place=Charolles");

  expect(response.status).toBe(400);
  expect(suggestWords).not.toHaveBeenCalled();
});
