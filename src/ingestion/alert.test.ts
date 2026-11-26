import { describe, expect, it, vi } from "vitest";
import { type Alert, type Fetch, createAlerter } from "./alert";

const ALERT: Alert = {
  event: "delivery.rejected",
  text: "Dépôt refusé",
  details: { delivery: "delivery-2026-11-24-0930.zip", errors: 2 },
};

function setup(webhookUrl: string | undefined, fetch: Fetch) {
  const log = vi.fn<(message: string) => void>();
  return { log, send: createAlerter({ webhookUrl, fetch, log }) };
}

describe("createAlerter", () => {
  it("journalise seulement sans webhook", async () => {
    const fetch = vi.fn<Fetch>();
    const { log, send } = setup(undefined, fetch);

    await send(ALERT);

    expect(fetch).not.toHaveBeenCalled();
    expect(log.mock.calls.map(([line]): unknown => JSON.parse(line))).toEqual([
      { event: "ingest.alert", alert: ALERT },
    ]);
  });

  it("poste l'alerte en JSON au webhook", async () => {
    const fetch = vi.fn<Fetch>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    );
    const { log, send } = setup("http://hook.test/alert", fetch);

    await send(ALERT);

    const [[url, init]] = fetch.mock.calls;
    expect(url).toBe("http://hook.test/alert");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    expect(JSON.parse(String(init.body))).toEqual(ALERT);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("journalise un webhook en erreur sans lever", async () => {
    const fetch = vi.fn<Fetch>(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    );
    const { log, send } = setup("http://hook.test/alert", fetch);

    await expect(send(ALERT)).resolves.toBeUndefined();

    expect(JSON.parse(log.mock.calls[1][0])).toEqual({
      event: "ingest.alert-failed",
      alert: "delivery.rejected",
      error: "webhook en 500",
    });
  });

  it("journalise un webhook injoignable sans lever", async () => {
    const fetch = vi.fn<Fetch>(() => Promise.reject(new Error("refusé")));
    const { log, send } = setup("http://hook.test/alert", fetch);

    await send(ALERT);

    expect(JSON.parse(log.mock.calls[1][0])).toMatchObject({
      error: "refusé",
    });
  });
});
