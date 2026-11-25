export type Env = Record<string, string | undefined>;

export function parsePositiveInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} attend un entier positif (reçu : ${value})`);
  }
  return parsed;
}

export function requireEnv(env: Env, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} est obligatoire`);
  return value;
}
