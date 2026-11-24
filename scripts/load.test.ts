import { expect, it, vi } from "vitest";
import { runLoad } from "./load-notebooks";

vi.mock("./load-notebooks", () => ({ runLoad: vi.fn() }));

it("lance le chargement avec les arguments et l'environnement du processus", async () => {
  vi.stubGlobal("process", {
    ...process,
    argv: ["node", "scripts/load.ts", "--source", "data/fake-data"],
  });

  await import("./load");

  expect(runLoad).toHaveBeenCalledWith(
    ["--source", "data/fake-data"],
    process.env,
  );
  vi.unstubAllGlobals();
});
