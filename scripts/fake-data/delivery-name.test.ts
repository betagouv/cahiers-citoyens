import { describe, expect, it } from "vitest";
import { deliveryFileName } from "./delivery-name";

describe("deliveryFileName", () => {
  it("nomme le ZIP d'après la minute UTC du dépôt", () => {
    expect(deliveryFileName(new Date("2026-11-24T09:30:59Z"))).toBe(
      "delivery-2026-11-24-0930.zip",
    );
    expect(deliveryFileName(new Date("2026-01-02T23:05:00+02:00"))).toBe(
      "delivery-2026-01-02-2105.zip",
    );
  });
});
