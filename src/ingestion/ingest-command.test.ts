import { describe, expect, it } from "vitest";
import { parseIngestCommand } from "./ingest-command";

const USAGE =
  "usage : ingest [run] | ingest withdraw <id_cahier> --reason <motif>";

describe("parseIngestCommand", () => {
  it("lance run sans argument ou avec run", () => {
    expect(parseIngestCommand([])).toEqual({ kind: "run" });
    expect(parseIngestCommand(["run"])).toEqual({ kind: "run" });
  });

  it("lit le cahier et le motif d'un retrait", () => {
    expect(
      parseIngestCommand(["withdraw", "CC_1", "--reason", "sensitive_content"]),
    ).toEqual({ kind: "withdraw", id: "CC_1", reason: "sensitive_content" });
  });

  it("exige un motif connu", () => {
    expect(() => parseIngestCommand(["withdraw", "CC_1"])).toThrow(
      "--reason est obligatoire (not_publishable, sensitive_content, source_correction, other)",
    );
    expect(() =>
      parseIngestCommand(["withdraw", "CC_1", "--reason", "spam"]),
    ).toThrow(
      "--reason inconnu : spam (attendu : not_publishable, sensitive_content, source_correction, other)",
    );
  });

  it("refuse toute autre forme", () => {
    for (const args of [
      ["run", "x"],
      ["run", "--reason", "other"],
      ["withdraw"],
      ["withdraw", "a", "b", "--reason", "other"],
      ["publish"],
    ]) {
      expect(() => parseIngestCommand(args)).toThrow(USAGE);
    }
    expect(() => parseIngestCommand(["--force"])).toThrow("Unknown option");
  });
});
