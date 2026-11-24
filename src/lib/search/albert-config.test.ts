import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHAT_MODEL, createAlbertClient } from "../albert";
import { chatModelName, getAlbert } from "./albert-config";

vi.mock("../albert", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../albert")>()),
  createAlbertClient: vi.fn(() => ({ fake: true })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("chatModelName", () => {
  it("prend ALBERT_CHAT_MODEL, sinon le modèle par défaut", () => {
    vi.stubEnv("ALBERT_CHAT_MODEL", "autre-modele");
    expect(chatModelName()).toBe("autre-modele");

    vi.stubEnv("ALBERT_CHAT_MODEL", "");
    expect(chatModelName()).toBe(DEFAULT_CHAT_MODEL);
  });
});

describe("getAlbert", () => {
  it("renvoie undefined sans clé d'API", () => {
    vi.stubEnv("ALBERT_API_KEY", "");

    expect(getAlbert()).toBeUndefined();
    expect(createAlbertClient).not.toHaveBeenCalled();
  });

  it("crée le client avec la clé, l'URL et le modèle de chat", () => {
    vi.stubEnv("ALBERT_API_KEY", "cle");
    vi.stubEnv("ALBERT_BASE_URL", "https://albert.example/v1");
    vi.stubEnv("ALBERT_CHAT_MODEL", "autre-modele");

    expect(getAlbert()).toEqual({ fake: true });
    expect(createAlbertClient).toHaveBeenCalledWith({
      apiKey: "cle",
      baseUrl: "https://albert.example/v1",
      chatModel: "autre-modele",
    });
  });

  it("garde l'URL par défaut quand ALBERT_BASE_URL est vide", () => {
    vi.stubEnv("ALBERT_API_KEY", "cle");
    vi.stubEnv("ALBERT_BASE_URL", "");
    vi.stubEnv("ALBERT_CHAT_MODEL", "");

    getAlbert();

    expect(createAlbertClient).toHaveBeenCalledWith({
      apiKey: "cle",
      baseUrl: undefined,
      chatModel: DEFAULT_CHAT_MODEL,
    });
  });
});
