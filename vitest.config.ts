import { configDefaults, defineConfig } from "vitest/config";

// Les worktrees d'agents vivent dans `.claude/worktrees/` avec leurs propres
// tests : sans cette exclusion, ils s'exécutent ici contre le mauvais arbre.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
  },
});
