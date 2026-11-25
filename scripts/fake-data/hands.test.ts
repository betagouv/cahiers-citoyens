import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fontCss, newHand, registerFonts } from "./hands";
import { createRandom } from "./random";

describe("registerFonts", () => {
  it("enregistre les polices livrées avec le générateur", () => {
    expect(() =>
      registerFonts(join(import.meta.dirname, "fonts")),
    ).not.toThrow();
  });

  it("signale une police introuvable", () => {
    expect(() => registerFonts(join(import.meta.dirname, "absent"))).toThrow(
      "police illisible",
    );
  });
});

describe("newHand", () => {
  it("change toujours de police par rapport à la main précédente", () => {
    const random = createRandom("mains");
    let previous = newHand(random, null);
    for (let i = 0; i < 50; i++) {
      const hand = newHand(random, previous.font);
      expect(hand.font).not.toBe(previous.font);
      expect(hand.pressure).toBeGreaterThanOrEqual(0.82);
      expect(hand.pressure).toBeLessThan(0.98);
      previous = hand;
    }
  });

  it("décrit la police en CSS", () => {
    const hand = newHand(createRandom("css"), null);
    expect(fontCss(hand)).toBe(`${hand.font.size}px "${hand.font.family}"`);
  });
});
