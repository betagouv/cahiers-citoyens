export function parseDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error("DATABASE_URL est obligatoire");
  if (!URL.canParse(value)) {
    throw new Error("DATABASE_URL n'est pas une URL valide");
  }
  const { protocol } = new URL(value);
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error(
      `DATABASE_URL doit être une URL postgres (reçu : ${protocol})`,
    );
  }
  return value;
}
