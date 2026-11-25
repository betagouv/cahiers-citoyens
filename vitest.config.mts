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
