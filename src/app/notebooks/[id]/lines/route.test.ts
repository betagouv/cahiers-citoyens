import { beforeEach, describe, expect, it, vi } from "vitest";
import { listKeywordLines } from "@/lib/keyword-lines";
import { GET } from "./route";

vi.mock("@/lib/keyword-lines", () => ({ listKeywordLines: vi.fn() }));

function request(query: string) {
  return GET(new Request(`http://localhost/notebooks/CC_1/lines${query}`), {
    params: Promise.resolve({ id: "CC_1" }),
  });
}

beforeEach(() => {
  vi.mocked(listKeywordLines).mockReset();
});

describe("GET /notebooks/[id]/lines", () => {
  it("renvoie les lignes du mot-clé, gardées un jour par le navigateur", async () => {
    vi.mocked(listKeywordLines).mockResolvedValue([
      { page: 1, points: "0,0 10,0 10,5" },
    ]);

    const response = await request("?v=2&q=imp%C3%B4t");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=86400",
    );
    await expect(response.json()).resolves.toEqual({
      lines: [{ page: 1, points: "0,0 10,0 10,5" }],
    });
    expect(listKeywordLines).toHaveBeenCalledWith("CC_1", 2, "impôt");
  });

  it.each(["?q=imp%C3%B4t", "?v=0&q=imp%C3%B4t", "?v=2", "?v=2&q=%E2%80%A6"])(
    "refuse %s sans lire la base",
    async (query) => {
      const response = await request(query);

      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(listKeywordLines).not.toHaveBeenCalled();
    },
  );
});
