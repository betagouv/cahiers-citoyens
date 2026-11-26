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
  // Des dépendances CommonJS (yauzl, le SDK S3) appellent `require` sur des
  // modules de Node, qu'un module ESM n'a pas : on le lui fournit.
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
  logLevel: "warning",
});
