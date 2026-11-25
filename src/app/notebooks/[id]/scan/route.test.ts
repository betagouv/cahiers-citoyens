import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getScanKey } from "@/lib/notebooks";
import { StorageNotConfiguredError, openScan } from "@/lib/scan-storage";
import { GET } from "./route";

vi.mock("@/lib/notebooks", () => ({ getScanKey: vi.fn() }));
vi.mock("@/lib/scan-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/scan-storage")>()),
  openScan: vi.fn(),
}));

const SCAN_KEY = "notebooks/notebook-0001/scan.pdf";

function get(id: string, headers: HeadersInit = {}) {
  return GET(
    new Request(`http://localhost/notebooks/${id}/scan`, { headers }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.mocked(getScanKey).mockResolvedValue(SCAN_KEY);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /notebooks/[id]/scan", () => {
  it("relaie le PDF du stockage, avec la plage demandée", async () => {
    vi.mocked(openScan).mockResolvedValue({
      body: new Blob(["%PDF"]).stream(),
      contentLength: 4,
      contentRange: "bytes 0-3/10",
      etag: undefined,
    });

    const response = await get("notebook-0001", { range: "bytes=0-3" });

    expect(getScanKey).toHaveBeenCalledWith("notebook-0001");
    expect(openScan).toHaveBeenCalledWith(
      SCAN_KEY,
      "bytes=0-3",
      expect.any(AbortSignal),
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    await expect(response.text()).resolves.toBe("%PDF");
  });

  it("ignore une plage qu'il ne sait pas relayer", async () => {
    vi.mocked(openScan).mockResolvedValue(undefined);

    await get("notebook-0001", { range: "bytes=0-1,4-5" });

    expect(openScan).toHaveBeenCalledWith(
      SCAN_KEY,
      undefined,
      expect.any(AbortSignal),
    );
  });

  it("répond 404 pour un cahier inconnu, sans lire le stockage", async () => {
    vi.mocked(getScanKey).mockResolvedValue(undefined);

    const response = await get("inconnu");

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Cahier introuvable");
    expect(openScan).not.toHaveBeenCalled();
  });

  it("répond 404 si le scan manque dans le stockage", async () => {
    vi.mocked(openScan).mockResolvedValue(undefined);

    const response = await get("notebook-0001");

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Scan introuvable");
  });

  it("répond 503 si le stockage n'est pas configuré", async () => {
    vi.mocked(openScan).mockRejectedValue(
      new StorageNotConfiguredError("variables manquantes : S3_BUCKET"),
    );

    const response = await get("notebook-0001");

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe(
      "Stockage des scans non configuré",
    );
    expect(console.error).toHaveBeenCalledWith(
      "Scan de notebook-0001 indisponible : variables manquantes : S3_BUCKET",
    );
  });

  it("répond 502 si le stockage échoue", async () => {
    const failure = new Error("réseau");
    vi.mocked(openScan).mockRejectedValue(failure);

    const response = await get("notebook-0001");

    expect(response.status).toBe(502);
    await expect(response.text()).resolves.toBe(
      "Stockage des scans indisponible",
    );
    expect(console.error).toHaveBeenCalledWith(
      "Scan de notebook-0001 illisible dans le stockage",
      failure,
    );
  });
});
