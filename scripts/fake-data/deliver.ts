import { join } from "node:path";
import { parseDeliverArgs } from "./deliver-args";
import { planDelivery } from "./delivery-plan";
import { registerFonts } from "./hands";
import { describeNotebook, writeDelivery } from "./write-delivery";

const { out, options } = parseDeliverArgs(process.argv.slice(2));
const spec = planDelivery(options);
const start = performance.now();
registerFonts(join(import.meta.dirname, "fonts"));
const path = await writeDelivery(spec, out);
spec.notebooks
  .map(describeNotebook)
  .filter((line): line is string => line !== null)
  .forEach((line) => console.log(line));
console.log(
  `${spec.notebooks.length} cahiers écrits dans ${path} en ${((performance.now() - start) / 1000).toFixed(1)} s`,
);
