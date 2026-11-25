import { parseArgs } from "node:util";

export interface GenerateArgs {
  count: number;
  out: string;
  seed: string;
}

export function parseGenerateArgs(args: string[]): GenerateArgs {
  const { values } = parseArgs({
    args,
    options: {
      count: { type: "string", default: "200" },
      out: { type: "string", default: "data/fake-data" },
      seed: { type: "string", default: "42" },
    },
  });
  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 1 || count > 9999) {
    throw new Error(
      `--count doit être un entier entre 1 et 9999 (reçu : ${values.count})`,
    );
  }
  return { count, out: values.out, seed: values.seed };
}
