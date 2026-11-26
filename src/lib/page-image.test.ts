import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPageImage, parsePageImageTarget } from "./page-image";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("parsePageImageTarget", () => {
  it("lit le numéro de page et la version", () => {
    expect(parsePageImageTarget("3", "2")).toEqual({ page: 3, version: 2 });
  });

  it("refuse tout autre numéro ou version", () => {
    expect(parsePageImageTarget("3", null)).toBeUndefined();
    expect(parsePageImageTarget("0", "1")).toBeUndefined();
    expect(parsePageImageTarget("03", "1")).toBeUndefined();
    expect(parsePageImageTarget("3.5", "1")).toBeUndefined();
    expect(parsePageImageTarget("3", "")).toBeUndefined();
    expect(parsePageImageTarget("3", "-1")).toBeUndefined();
    expect(parsePageImageTarget("1", "9999999999")).toBeUndefined();
  });
});

describe("getPageImage", () => {
  it("renvoie la clé et le type de l'image d'une page en ligne", async () => {
    fake.reply([["notebooks/CC_1/v2/3.jpg", "image/jpeg"]]);

    await expect(
      getPageImage("CC_1", { page: 3, version: 2 }),
    ).resolves.toEqual({
      key: "notebooks/CC_1/v2/3.jpg",
      contentType: "image/jpeg",
    });
    const [query] = fake.queries;
    expect(query.sql).toContain(
      'where ("pages"."notebook_id" = $1 and "pages"."number" = $2 and "notebooks"."status" = $3 and "notebooks"."online_version" = $4)',
    );
    expect(query.params).toEqual(["CC_1", 3, "published", 2]);
  });

  it("renvoie undefined pour une page absente, un cahier retiré ou une autre version", async () => {
    await expect(
      getPageImage("CC_1", { page: 3, version: 1 }),
    ).resolves.toBeUndefined();
  });
});
