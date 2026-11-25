import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Les worktrees d'agents ont leurs propres tests, à ne pas lancer ici.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
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
