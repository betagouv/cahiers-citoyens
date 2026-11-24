import { expect, it, vi } from "vitest";
import { runSearch } from "./search-chunks";

vi.mock("./search-chunks", () => ({ runSearch: vi.fn() }));

it("lance la recherche avec les arguments et l'environnement du processus", async () => {
  vi.stubGlobal("process", {
    ...process,
    argv: ["node", "scripts/search.ts", "plus de médecin", "--limit", "3"],
  });

  await import("./search");

  expect(runSearch).toHaveBeenCalledWith(
    ["plus de médecin", "--limit", "3"],
    process.env,
  );
  vi.unstubAllGlobals();
});
