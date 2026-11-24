import { join } from "node:path";
import { parseGenerateArgs } from "./generate-args";
import { registerFonts } from "./hands";
import { writeDataset } from "./write-dataset";

const args = parseGenerateArgs(process.argv.slice(2));
const start = performance.now();
registerFonts(join(import.meta.dirname, "fonts"));
await writeDataset(args, console.log);
console.log(
  `${args.count} cahiers écrits dans ${args.out} en ${((performance.now() - start) / 1000).toFixed(1)} s`,
);
