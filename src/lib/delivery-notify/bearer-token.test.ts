import { describe, expect, it } from "vitest";
import { hasBearerToken } from "./bearer-token";

const TOKEN = "jeton-fictif-0123456789";

describe("hasBearerToken", () => {
  it("accepte le jeton attendu", () => {
    expect(hasBearerToken(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it("refuse un autre jeton, même de longueur différente", () => {
    expect(hasBearerToken("Bearer jeton-fictif-0123456780", TOKEN)).toBe(false);
    expect(hasBearerToken("Bearer court", TOKEN)).toBe(false);
  });

  it("refuse un en-tête absent ou d'un autre schéma", () => {
    expect(hasBearerToken(null, TOKEN)).toBe(false);
    expect(hasBearerToken(TOKEN, TOKEN)).toBe(false);
    expect(hasBearerToken(`Basic ${TOKEN}`, TOKEN)).toBe(false);
    expect(hasBearerToken("Bearer ", TOKEN)).toBe(false);
  });

  it("refuse tout quand aucun jeton n'est configuré", () => {
    expect(hasBearerToken("Bearer ", "")).toBe(false);
    expect(hasBearerToken("Bearer x", undefined)).toBe(false);
  });
});
