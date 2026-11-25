import { build } from "esbuild";

await build({
  entryPoints: {
    ingest: "src/ingestion/job.ts",
    "load-geography": "scripts/load-geography.ts",
  },
  outdir: "dist/jobs",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  logLevel: "warning",
});
