import { errorMessage } from "./error-message";

interface JobSuccess {
  event: string;
  ok: true;
  durationMs: number;
}

interface JobFailure {
  event: string;
  ok: false;
  durationMs: number;
  error: string;
}

export type JobReport = JobSuccess | JobFailure;

export function exitCode(report: JobReport): number {
  return report.ok ? 0 : 1;
}

export async function runJob(
  event: string,
  task: () => Promise<void>,
  now: () => number = () => performance.now(),
): Promise<JobReport> {
  const startedAt = now();
  try {
    await task();
    return { event, ok: true, durationMs: Math.round(now() - startedAt) };
  } catch (error) {
    return {
      event,
      ok: false,
      durationMs: Math.round(now() - startedAt),
      error: errorMessage(error),
    };
  }
}
