import { expect, it, vi } from "vitest";
import { runLoadGeography } from "./geography/run-load-geography";

vi.mock("./geography/run-load-geography", () => ({
  runLoadGeography: vi.fn(),
}));

it("lance le chargement avec les arguments, l'environnement et fetch", async () => {
  vi.stubGlobal("process", {
    ...process,
    argv: ["node", "scripts/load-geography.ts", "--movements-url", "u"],
  });

  await import("./load-geography");

  expect(runLoadGeography).toHaveBeenCalledWith(
    ["--movements-url", "u"],
    process.env,
    fetch,
  );
  vi.unstubAllGlobals();
});
