import { describe, expect, it } from "vitest";
import { scanResponse } from "./scan-response";

function scan(overrides: Partial<Parameters<typeof scanResponse>[1]> = {}) {
  return {
    body: new Blob(["%PDF-1.7"]).stream(),
    contentLength: undefined,
    contentRange: undefined,
    etag: undefined,
    ...overrides,
  };
}

describe("scanResponse", () => {
  it("sert le PDF entier, affiché dans la page", async () => {
    const response = scanResponse("notebook-0001", scan());

    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toEqual({
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
      "content-disposition": 'inline; filename="notebook-0001.pdf"',
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    });
    await expect(response.text()).resolves.toBe("%PDF-1.7");
  });

  it("sert une plage en 206 avec sa taille, sa plage et son ETag", () => {
    const response = scanResponse(
      "notebook-0001",
      scan({
        contentLength: 8,
        contentRange: "bytes 0-7/100",
        etag: '"abc"',
      }),
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("content-length")).toBe("8");
    expect(response.headers.get("content-range")).toBe("bytes 0-7/100");
    expect(response.headers.get("etag")).toBe('"abc"');
  });
});
