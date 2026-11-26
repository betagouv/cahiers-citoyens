import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPageImage } from "@/lib/page-image";
import { StorageNotConfiguredError, openObject } from "@/lib/s3-storage";
import { GET } from "./route";

vi.mock("@/lib/page-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/page-image")>()),
  getPageImage: vi.fn(),
}));
vi.mock("@/lib/s3-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/s3-storage")>()),
  openObject: vi.fn(),
}));

const KEY = "notebooks/CC_1/v2/3.jpg";

function request(path = "/notebooks/CC_1/pages/3?v=2") {
  return GET(new Request(`http://localhost${path}`), {
    params: Promise.resolve({
      id: "CC_1",
      page: path.split("/")[4].split("?")[0],
    }),
  });
}

beforeEach(() => {
  vi.mocked(getPageImage).mockReset();
  vi.mocked(openObject).mockReset();
  vi.mocked(getPageImage).mockResolvedValue({
    key: KEY,
    contentType: "image/jpeg",
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /notebooks/[id]/pages/[page]", () => {
  it("sert l'image de la page en ligne depuis le stockage", async () => {
    vi.mocked(openObject).mockResolvedValue({
      body: new Response("jpeg").body ?? new ReadableStream(),
      contentLength: 4,
      etag: undefined,
    });

    const response = await request();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(await response.text()).toBe("jpeg");
    expect(getPageImage).toHaveBeenCalledWith("CC_1", { page: 3, version: 2 });
    expect(vi.mocked(openObject).mock.calls[0][0]).toBe(KEY);
  });

  it("répond 404 sans version ni numéro valides, sans lire la base", async () => {
    expect((await request("/notebooks/CC_1/pages/3")).status).toBe(404);
    expect((await request("/notebooks/CC_1/pages/abc?v=2")).status).toBe(404);
    expect(getPageImage).not.toHaveBeenCalled();
  });

  it("répond 404 pour un cahier retiré, une page absente ou une autre version", async () => {
    vi.mocked(getPageImage).mockResolvedValue(undefined);

    const response = await request();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(openObject).not.toHaveBeenCalled();
  });

  it("répond 404 pour une image absente du stockage", async () => {
    vi.mocked(openObject).mockResolvedValue(undefined);

    expect((await request()).status).toBe(404);
  });

  it("répond 503 sans configuration du stockage", async () => {
    vi.mocked(openObject).mockRejectedValue(
      new StorageNotConfiguredError("variables manquantes : S3_BUCKET"),
    );

    const response = await request();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Stockage des images non configuré");
  });

  it("répond 502 quand le stockage échoue", async () => {
    vi.mocked(openObject).mockRejectedValue(new Error("réseau"));

    const response = await request();

    expect(response.status).toBe(502);
    expect(await response.text()).toBe("Stockage des images indisponible");
  });
});
