import { stat } from "node:fs/promises";
import { join } from "node:path";
import { verifyDelivery } from "../src/ingestion/verify-delivery";
import { planDelivery } from "./fake-data/delivery-plan";
import { registerFonts } from "./fake-data/hands";
import { writeDelivery } from "./fake-data/write-delivery";
import { formatMebibytes, measure } from "./measure";
import { parseMeasureVerifyArgs } from "./measure-verify-args";

// Mesure la vérification d'un dépôt : `--zip <chemin>` pour un ZIP existant,
// sinon `--count <n> --out <dossier>` génère d'abord un faux dépôt.
const args = parseMeasureVerifyArgs(process.argv.slice(2));
let zip: string;
if (args.mode === "zip") {
  zip = args.zip;
} else {
  registerFonts(join(import.meta.dirname, "fake-data", "fonts"));
  const spec = planDelivery({
    count: args.count,
    seed: "42",
    createdAt: new Date("2026-11-24T09:30:00Z"),
    modify: 0,
    gaps: true,
    defects: [],
  });
  zip = await writeDelivery(spec, args.out);
}

const { size } = await stat(zip);
const { value, seconds, peakRss } = await measure(() => verifyDelivery(zip));
const pages = value.ok
  ? value.delivery.notebooks.reduce((sum, { images }) => sum + images.length, 0)
  : 0;
console.log(
  `${zip} : ${formatMebibytes(size)}, ${value.ok ? `${value.delivery.notebooks.length} cahiers, ${pages} pages, accepté` : `refusé (${value.errors.length} erreurs)`}`,
);
console.log(
  `vérifié en ${seconds.toFixed(1)} s, mémoire résidente maximale ${formatMebibytes(peakRss)}`,
);
