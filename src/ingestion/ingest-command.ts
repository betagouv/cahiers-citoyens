import { parseArgs } from "node:util";
import { WITHDRAWAL_REASONS, type WithdrawalReason } from "./notebook-status";

export type IngestCommand =
  { kind: "run" } | { kind: "withdraw"; id: string; reason: WithdrawalReason };

const USAGE =
  "usage : ingest [run] | ingest withdraw <id_cahier> --reason <motif>";

function isWithdrawalReason(value: string): value is WithdrawalReason {
  return WITHDRAWAL_REASONS.some((reason) => reason === value);
}

function parseReason(value: string | undefined): WithdrawalReason {
  if (value === undefined) {
    throw new Error(
      `--reason est obligatoire (${WITHDRAWAL_REASONS.join(", ")})`,
    );
  }
  if (!isWithdrawalReason(value)) {
    throw new Error(
      `--reason inconnu : ${value} (attendu : ${WITHDRAWAL_REASONS.join(", ")})`,
    );
  }
  return value;
}

// Sans argument, `run` : c'est la commande du cron.
export function parseIngestCommand(args: string[]): IngestCommand {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { reason: { type: "string" } },
  });
  const [command = "run", id, ...extra] = positionals;
  if (command === "run" && id === undefined && values.reason === undefined) {
    return { kind: "run" };
  }
  if (command === "withdraw" && id !== undefined && extra.length === 0) {
    return { kind: "withdraw", id, reason: parseReason(values.reason) };
  }
  throw new Error(USAGE);
}
