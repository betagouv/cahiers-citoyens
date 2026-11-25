import { describe, expect, it } from "vitest";
import { parseNotebookId } from "./notebook-id";

describe("parseNotebookId", () => {
  it.each(["CC_01500_190318_01004_MD_16116", "a", "A.b-c_d", "1"])(
    "accepte %s",
    (name) => {
      expect(parseNotebookId(name)).toEqual({ ok: true, id: name });
    },
  );

  it("accepte 200 caractères", () => {
    expect(parseNotebookId("x".repeat(200)).ok).toBe(true);
  });

  it.each([
    "",
    ".hidden",
    "-x",
    "_x",
    "a/b",
    "a\\b",
    "é",
    "a b",
    "x".repeat(201),
  ])("refuse %j", (name) => {
    expect(parseNotebookId(name)).toMatchObject({
      ok: false,
      error: { notebook: name, code: "invalid-notebook-id" },
    });
  });
});
