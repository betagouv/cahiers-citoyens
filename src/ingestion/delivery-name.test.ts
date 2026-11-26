import { describe, expect, it } from "vitest";
import { checkDeliveryName, deliveryFileName } from "./delivery-name";

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

describe("checkDeliveryName", () => {
  it("accepte un nom à la minute UTC", () => {
    expect(checkDeliveryName("delivery-2026-11-24-0930.zip")).toEqual([]);
    expect(checkDeliveryName("delivery-2028-02-29-2359.zip")).toEqual([]);
  });

  it.each([
    "delivery-2026-02-30-0930.zip",
    "delivery-2026-13-01-0930.zip",
    "delivery-2026-11-24-2460.zip",
    "delivery-2026-11-24-0930.ZIP",
    "delivery-2026-11-24-930.zip",
    "livraison.zip",
  ])("refuse %s", (name) => {
    expect(checkDeliveryName(name)).toEqual([
      {
        file: name,
        code: "invalid-delivery-name",
        message: `Le dépôt s'appelle ${name} : nom attendu delivery-AAAA-MM-JJ-HHMM.zip, avec une date et une heure UTC réelles.`,
      },
    ]);
  });
});
