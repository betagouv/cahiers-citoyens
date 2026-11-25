import { describe, expect, it } from "vitest";
import { parseDatabaseUrl } from "./database-url";

describe("parseDatabaseUrl", () => {
  it("accepte les schémas postgres et postgresql", () => {
    expect(parseDatabaseUrl("postgres://localhost:5432/cahiers")).toBe(
      "postgres://localhost:5432/cahiers",
    );
    expect(parseDatabaseUrl("postgresql://u:p@localhost/cahiers")).toBe(
      "postgresql://u:p@localhost/cahiers",
    );
  });

  it("refuse une valeur absente ou vide", () => {
    expect(() => parseDatabaseUrl(undefined)).toThrow(
      "DATABASE_URL est obligatoire",
    );
    expect(() => parseDatabaseUrl("")).toThrow("DATABASE_URL est obligatoire");
  });

  it("refuse une valeur qui n'est pas une URL, sans la recopier", () => {
    expect(() => parseDatabaseUrl("motdepasse-secret")).toThrow(
      "DATABASE_URL n'est pas une URL valide",
    );
  });

  it("refuse un autre schéma", () => {
    expect(() => parseDatabaseUrl("mysql://localhost/cahiers")).toThrow(
      "DATABASE_URL doit être une URL postgres (reçu : mysql:)",
    );
  });
});
