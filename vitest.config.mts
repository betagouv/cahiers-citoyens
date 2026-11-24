import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        // Déclarations de types, aucune instruction exécutable.
        "**/*.d.ts",
        // Exclusion temporaire : la branche feat/ingestion-fake-deliveries
        // réécrit ce dossier et le porte à 100 % ; elle retire cette ligne.
        "scripts/fake-data/**",
      ],
      reporter: ["text-summary", "text"],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
