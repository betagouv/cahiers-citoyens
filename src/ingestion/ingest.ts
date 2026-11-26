import { errorMessage } from "./error-message";
import { type IngestCommand, parseIngestCommand } from "./ingest-command";
import { type JobRun, runIngest } from "./ingest-run";
import {
  type Env,
  type IngestServices,
  type OpenStorage,
  openIngestServices,
} from "./ingest-services";
import { runError } from "./run-error";
import { withdrawNotebook } from "./withdraw";

export interface CommandContext {
  env: Env;
  openStorage: OpenStorage;
  now: () => Date;
  // La ligne JSON du résultat, seule sortie standard de la commande.
  print: (line: string) => void;
  // Messages de suivi, en texte, sur la sortie d'erreur.
  log: (message: string) => void;
}

interface Outcome {
  report: object;
  ok: boolean;
}

function failedRun(startedAt: Date, finishedAt: Date, error: unknown): JobRun {
  return {
    event: "ingest.run",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    locked: false,
    deliveries: [],
    embedded: 0,
    errors: [runError("run", error)],
  };
}

async function execute(
  command: IngestCommand,
  services: IngestServices,
  { now, log }: CommandContext,
): Promise<Outcome> {
  switch (command.kind) {
    case "run": {
      const run = await runIngest({ ...services, now, log });
      return { report: run, ok: run.errors.length === 0 };
    }
    case "withdraw": {
      const { id, reason } = command;
      const report = { event: "ingest.withdraw", id, reason };
      try {
        const deps = { db: services.db, storage: services.images, log };
        const result = await withdrawNotebook(deps, id, reason);
        return { report: { ...report, result }, ok: true };
      } catch (error) {
        return { report: { ...report, error: errorMessage(error) }, ok: false };
      }
    }
  }
}

function failure(
  command: IngestCommand,
  startedAt: Date,
  ctx: CommandContext,
  error: unknown,
): Outcome {
  if (command.kind === "run") {
    return { report: failedRun(startedAt, ctx.now(), error), ok: false };
  }
  const { id, reason } = command;
  const message = errorMessage(error);
  return {
    report: { event: "ingest.withdraw", id, reason, error: message },
    ok: false,
  };
}

async function outcome(args: string[], ctx: CommandContext): Promise<Outcome> {
  const startedAt = ctx.now();
  let command: IngestCommand;
  try {
    command = parseIngestCommand(args);
  } catch (error) {
    return {
      report: { event: "ingest.usage", error: errorMessage(error) },
      ok: false,
    };
  }
  let services: IngestServices;
  try {
    services = openIngestServices(ctx.env, ctx.openStorage, ctx.log);
  } catch (error) {
    return failure(command, startedAt, ctx, error);
  }
  try {
    return await execute(command, services, ctx);
  } finally {
    await services.close();
  }
}

// `ingest run` (le cron) ou `ingest withdraw <id> --reason …`. Écrit une ligne
// JSON et renvoie le code de sortie : 1 si la commande a rencontré une erreur.
export async function runIngestCommand(
  args: string[],
  ctx: CommandContext,
): Promise<number> {
  const { report, ok } = await outcome(args, ctx);
  ctx.print(JSON.stringify(report));
  return ok ? 0 : 1;
}
