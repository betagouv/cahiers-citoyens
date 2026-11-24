import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notebookExists } from "@/lib/notebooks";
import { config, proxy } from "./proxy";

vi.mock("@/lib/notebooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/notebooks")>()),
  notebookExists: vi.fn(),
}));

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

beforeEach(() => {
  vi.mocked(notebookExists).mockReset();
});

describe("proxy", () => {
  it("laisse passer un cahier qui existe", async () => {
    vi.mocked(notebookExists).mockResolvedValue(true);

    const response = await proxy(request("/notebooks/notebook-0001"));

    expect(notebookExists).toHaveBeenCalledWith("notebook-0001");
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("réécrit un cahier inconnu vers la page 404", async () => {
    vi.mocked(notebookExists).mockResolvedValue(false);

    const response = await proxy(request("/notebooks/inconnu"));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3000/_not-found",
    );
  });

  it("ne consulte pas la base pour un autre chemin", async () => {
    const response = await proxy(request("/notebooks/%E0%A4%A"));

    expect(notebookExists).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("ne s'applique qu'aux pages de cahier", () => {
    expect(config).toEqual({ matcher: "/notebooks/:id" });
  });
});
