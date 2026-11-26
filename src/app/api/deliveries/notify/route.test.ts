import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { after } from "next/server";
import { runIngestJob } from "@/ingestion/ingest-job";

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/ingestion/ingest-job", () => ({
  runIngestJob: vi.fn(async () => 0),
}));

const TOKEN = "jeton-fictif-0123456789";
const URL = "http://localhost/api/deliveries/notify";

function notify(authorization?: string): Request {
  const headers = authorization ? { authorization } : undefined;
  return new Request(URL, { method: "POST", headers, body: "ignoré" });
}

// Chaque test part d'une route neuve : la limite de fréquence est propre au module.
async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  vi.stubEnv("DELIVERY_NOTIFY_TOKEN", TOKEN);
  vi.useFakeTimers({ now: new Date("2026-11-26T10:00:00Z") });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.mocked(after).mockReset();
  vi.mocked(runIngestJob).mockClear();
});

describe("POST /api/deliveries/notify", () => {
  it("répond 401 sans corps pour un jeton absent ou faux", async () => {
    const { POST } = await loadRoute();

    for (const request of [notify(), notify("Bearer faux")]) {
      const response = await POST(request);
      expect(response.status).toBe(401);
      await expect(response.text()).resolves.toBe("");
    }
    expect(after).not.toHaveBeenCalled();
  });

  it("répond 401 quand aucun jeton n'est configuré", async () => {
    vi.stubEnv("DELIVERY_NOTIFY_TOKEN", undefined);
    const { POST } = await loadRoute();

    const response = await POST(notify("Bearer "));

    expect(response.status).toBe(401);
    expect(after).not.toHaveBeenCalled();
  });

  it("accepte et lance le job après la réponse", async () => {
    const { POST } = await loadRoute();

    const response = await POST(notify(`Bearer ${TOKEN}`));

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "accepted" });
    expect(runIngestJob).not.toHaveBeenCalled();
    const [[task]] = vi.mocked(after).mock.calls;
    expect(typeof task).toBe("function");
    if (typeof task === "function") await task();
    expect(runIngestJob).toHaveBeenCalledWith(["run"], process.env);
  });

  it("ne relance pas de passage moins de 30 s après le précédent", async () => {
    const { POST } = await loadRoute();
    await POST(notify(`Bearer ${TOKEN}`));
    vi.advanceTimersByTime(29_999);
    const throttled = await POST(notify(`Bearer ${TOKEN}`));
    vi.advanceTimersByTime(1);
    await POST(notify(`Bearer ${TOKEN}`));

    expect(throttled.status).toBe(202);
    await expect(throttled.json()).resolves.toEqual({ status: "accepted" });
    expect(after).toHaveBeenCalledTimes(2);
  });
});
