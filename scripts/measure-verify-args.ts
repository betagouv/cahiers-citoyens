import { parseArgs } from "node:util";

export type MeasureVerifyArgs =
  | { mode: "zip"; zip: string }
  | { mode: "generate"; count: number; out: string };

export function parseMeasureVerifyArgs(args: string[]): MeasureVerifyArgs {
  const { values } = parseArgs({
    args,
    options: {
      zip: { type: "string" },
      count: { type: "string", default: "50" },
      out: { type: "string", default: "data/deliveries" },
    },
  });
  if (values.zip !== undefined) {
    return { mode: "zip", zip: values.zip };
  }
  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 1 || count > 9999) {
    throw new Error(
      `--count doit être un entier entre 1 et 9999 (reçu : ${values.count})`,
    );
  }
  return { mode: "generate", count, out: values.out };
}
