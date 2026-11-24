import { expect, it, vi } from "vitest";
import { runEmbed } from "./embed-chunks";

vi.mock("./embed-chunks", () => ({ runEmbed: vi.fn() }));

it("lance la vectorisation avec les arguments et l'environnement du processus", async () => {
  vi.stubGlobal("process", {
    ...process,
    argv: ["node", "scripts/embed.ts", "--limit", "5"],
  });

  await import("./embed");

  expect(runEmbed).toHaveBeenCalledWith(["--limit", "5"], process.env);
  vi.unstubAllGlobals();
});
