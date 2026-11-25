import { expect, it, vi } from "vitest";
import { suggestPlaces } from "@/lib/page-search/suggest-places";
import { GET } from "./route";

vi.mock("@/lib/page-search/suggest-places", () => ({
  suggestPlaces: vi.fn(),
}));

it("renvoie les propositions de lieu, cacheables", async () => {
  const charolles = {
    kind: "municipality",
    code: "71106",
    name: "Charolles",
    departmentCode: "71",
    departmentName: "Saône-et-Loire",
    pageCount: 286,
  } as const;
  vi.mocked(suggestPlaces).mockResolvedValue([charolles]);

  const response = await GET(
    new Request("http://localhost/api/suggestions/places?q=Char"),
  );

  expect(suggestPlaces).toHaveBeenCalledWith("Char");
  expect(response.headers.get("cache-control")).toContain("max-age=60");
  await expect(response.json()).resolves.toEqual({ suggestions: [charolles] });
});
