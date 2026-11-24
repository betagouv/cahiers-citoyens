import { build } from "esbuild";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { outdir: { type: "string", default: "dist/jobs" } },
});

await build({
  entryPoints: { ingest: "src/ingestion/job.ts" },
  outdir: values.outdir,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  logLevel: "warning",
});
