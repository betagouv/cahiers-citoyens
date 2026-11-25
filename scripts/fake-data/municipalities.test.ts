import { describe, expect, it } from "vitest";
import { MUNICIPALITIES, withPreposition } from "./municipalities";

describe("withPreposition", () => {
  it("contracte les articles masculins et pluriels", () => {
    expect(withPreposition("de", "Le Havre")).toBe("du Havre");
    expect(withPreposition("à", "Le Havre")).toBe("au Havre");
    expect(withPreposition("de", "Les Mureaux")).toBe("des Mureaux");
    expect(withPreposition("à", "Les Mureaux")).toBe("aux Mureaux");
  });

  it("élide « de » devant une voyelle ou un h", () => {
    expect(withPreposition("de", "Amiens")).toBe("d'Amiens");
    expect(withPreposition("à", "Amiens")).toBe("à Amiens");
  });

  it("garde la préposition telle quelle sinon", () => {
    expect(withPreposition("de", "La Châtre")).toBe("de La Châtre");
    expect(withPreposition("à", "Nontron")).toBe("à Nontron");
  });
});

describe("MUNICIPALITIES", () => {
  it("donne un code INSEE à chaque commune", () => {
    expect(MUNICIPALITIES.length).toBeGreaterThan(50);
    for (const { inseeCode } of MUNICIPALITIES) {
      expect(inseeCode).toMatch(/^[0-9][0-9AB][0-9]{3}$/);
    }
  });
});
