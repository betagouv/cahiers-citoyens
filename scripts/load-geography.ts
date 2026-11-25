import { runLoadGeography } from "./geography/run-load-geography";

await runLoadGeography(process.argv.slice(2), process.env, fetch);
