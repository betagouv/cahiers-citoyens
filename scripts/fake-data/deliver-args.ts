import { parseArgs } from "node:util";
import { type Defect, DEFECTS, isDefect } from "./defects";
import type { DeliveryOptions } from "./delivery-plan";

export const DEFAULT_CREATED_AT = "2026-11-24T09:30:00Z";

export interface DeliverArgs {
  out: string;
  options: DeliveryOptions;
}

function parseInteger(
  name: string,
  value: string,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(
      `--${name} doit être un entier entre ${min} et ${max} (reçu : ${value})`,
    );
  }
  return parsed;
}

function parseCreatedAt(value: string): Date {
  const date = new Date(value);
  if (!/Z$/.test(value) || Number.isNaN(date.getTime())) {
    throw new Error(
      `--created-at attend une date ISO en UTC, par exemple ${DEFAULT_CREATED_AT} (reçu : ${value})`,
    );
  }
  return date;
}

function parseDefect(value: string): Defect {
  if (!isDefect(value)) {
    throw new Error(
      `--defect inconnu : ${value} (attendu : ${DEFECTS.join(", ")})`,
    );
  }
  return value;
}

export function parseDeliverArgs(args: string[]): DeliverArgs {
  const { values } = parseArgs({
    args,
    options: {
      count: { type: "string", default: "10" },
      seed: { type: "string", default: "42" },
      out: { type: "string", default: "data/deliveries" },
      "created-at": { type: "string", default: DEFAULT_CREATED_AT },
      modify: { type: "string", default: "0" },
      gaps: { type: "boolean", default: false },
      defect: { type: "string", multiple: true, default: [] },
    },
  });
  const count = parseInteger("count", values.count, 1, 9999);
  return {
    out: values.out,
    options: {
      count,
      seed: values.seed,
      createdAt: parseCreatedAt(values["created-at"]),
      modify: parseInteger("modify", values.modify, 0, count),
      gaps: values.gaps,
      defects: values.defect.map(parseDefect),
    },
  };
}
