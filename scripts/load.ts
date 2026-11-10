import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { chunkTranscription } from "./chunk";
import type { Municipality } from "./fake-data/domain";

interface NotebookMetadata {
  id: string;
  municipality: Municipality;
  openedOn: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseManifestLine(text: string, lineNumber: number): NotebookMetadata {
  function failure(reason: string): Error {
    return new Error(`manifest.jsonl ligne ${lineNumber} : ${reason}`);
  }
  function municipalityText(
    municipality: Record<string, unknown>,
    field: keyof Municipality,
  ): string {
    const value = municipality[field];
    if (typeof value !== "string" || value === "")
      throw failure(`municipality.${field} manquant`);
    return value;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw failure("JSON invalide");
  }
  if (!isObject(raw)) throw failure("objet attendu");
  const { id, municipality, openedOn } = raw;
  if (typeof id !== "string" || !/^notebook-\d+$/.test(id))
    throw failure(`id invalide (${String(id)})`);
  if (typeof openedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(openedOn)) {
    throw failure(`openedOn invalide (${String(openedOn)})`);
  }
  if (!isObject(municipality)) throw failure("municipality manquante");
  return {
    id,
    openedOn,
    municipality: {
      name: municipalityText(municipality, "name"),
      inseeCode: municipalityText(municipality, "inseeCode"),
      department: municipalityText(municipality, "department"),
      region: municipalityText(municipality, "region"),
    },
  };
}

const { values } = parseArgs({ options: { source: { type: "string" } } });
const source = values.source;
const databaseUrl = process.env.DATABASE_URL;
if (!source)
  throw new Error("--source est obligatoire (ex. --source data/fake-data)");
if (!databaseUrl) throw new Error("DATABASE_URL est obligatoire");

const manifest = await readFile(join(source, "manifest.jsonl"), "utf8");
const notebooks = manifest
  .split("\n")
  .map((line, i) => ({ line, lineNumber: i + 1 }))
  .filter(({ line }) => line.trim() !== "")
  .map(({ line, lineNumber }) => parseManifestLine(line, lineNumber));

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
try {
  let totalChunks = 0;
  for (const { id, municipality, openedOn } of notebooks) {
    const scanKey = `notebooks/${id}/scan.pdf`;
    const transcriptionKey = `notebooks/${id}/transcription.txt`;
    await access(join(source, scanKey));
    const transcription = await readFile(
      join(source, transcriptionKey),
      "utf8",
    );
    const chunks = chunkTranscription(transcription).map((content, i) => ({
      notebookId: id,
      position: i + 1,
      content,
    }));
    totalChunks += chunks.length;

    const fields = {
      inseeCode: municipality.inseeCode,
      municipality: municipality.name,
      department: municipality.department,
      region: municipality.region,
      openedOn: new Date(`${openedOn}T00:00:00Z`),
      scanKey,
      transcriptionKey,
      transcription,
    };
    await prisma.$transaction([
      prisma.notebook.upsert({
        where: { id },
        create: { id, ...fields },
        update: { ...fields, importedAt: new Date() },
      }),
      prisma.chunk.deleteMany({ where: { notebookId: id } }),
      prisma.chunk.createMany({ data: chunks }),
    ]);
  }
  console.log(
    `${notebooks.length} cahiers et ${totalChunks} chunks chargés depuis ${source}`,
  );
} finally {
  await prisma.$disconnect();
}
