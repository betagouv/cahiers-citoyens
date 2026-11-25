import { beforeEach, expect, it, vi } from "vitest";
import { countPages } from "@/lib/page-search/count-pages";
import { GET } from "./route";

vi.mock("@/lib/page-search/count-pages", () => ({ countPages: vi.fn() }));

beforeEach(() => {
  vi.mocked(countPages).mockReset();
  vi.mocked(countPages).mockResolvedValue(7);
});

function get(query: string) {
  return GET(new Request(`http://localhost/api/pages/count?${query}`));
}

it("compte les pages d'un lieu et d'un mot-clé", async () => {
  const response = await get("place=71106&q=%20retraite%20");

  expect(countPages).toHaveBeenCalledWith(
    { kind: "municipality", code: "71106" },
    "retraite",
  );
  expect(response.headers.get("cache-control")).toContain("s-maxage=300");
  await expect(response.json()).resolves.toEqual({ pageCount: 7 });
});

it("compte dans toute la France sans lieu", async () => {
  await get("q=retraite");

  expect(countPages).toHaveBeenCalledWith(undefined, "retraite");
});

it("refuse un lieu invalide", async () => {
  const response = await get("place=nulle-part&q=retraite");

  expect(response.status).toBe(400);
  expect(countPages).not.toHaveBeenCalled();
});
