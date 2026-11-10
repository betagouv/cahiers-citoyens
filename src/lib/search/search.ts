import {
  type AlbertClient,
  DEFAULT_CHAT_MODEL,
  createAlbertClient,
} from "../albert";
import { fuseRankings } from "./fusion";
import { buildAnswerMessages } from "./prompt";
import { type Candidate, searchByVector, searchFullText } from "./retrieval";

export const MAX_QUESTION_LENGTH = 500;
export const CANDIDATE_COUNT = 30;
export const SOURCE_COUNT = 5;
// Score du reclasseur (0 à 1) sous lequel un passage ne répond pas à la
// question : la recherche vectorielle renvoie toujours des voisins, même
// pour une question hors sujet, qui obtiennent alors moins de 0,001.
export const MIN_RELEVANCE = 0.01;

export interface Source extends Candidate {
  number: number;
}

export type SearchOutcome =
  | { status: "no-results"; notices: string[] }
  | {
      status: "answered";
      answer: string;
      chatModel: string;
      sources: Source[];
      notices: string[];
    }
  | {
      status: "sources-only";
      reason: string;
      sources: Source[];
      notices: string[];
    };

// `?q=` vient de l'URL : espaces normalisés, longueur bornée.
export function parseQuestion(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_LENGTH);
}

function chatModelName(): string {
  return process.env.ALBERT_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

function getAlbert(): AlbertClient | undefined {
  const apiKey = process.env.ALBERT_API_KEY;
  if (!apiKey) return undefined;
  return createAlbertClient({
    apiKey,
    baseUrl: process.env.ALBERT_BASE_URL || undefined,
    chatModel: chatModelName(),
  });
}

function logFailure(stage: string, error: unknown) {
  console.error(`Recherche : ${stage} en échec`, error);
}

// Embedding de la question, recherche hybride (plein texte + vecteurs,
// fusion RRF), reclassement, puis réponse rédigée à partir des 5 meilleurs
// passages. Chaque appel à Albert peut échouer sans faire tomber la page :
// on se replie sur ce qui reste (plein texte seul, ordre RRF, sources sans
// réponse) et on le signale.
export async function searchNotebooks(
  question: string,
): Promise<SearchOutcome> {
  const albert = getAlbert();
  const notices: string[] = [];

  let vector: number[] | undefined;
  if (albert === undefined) {
    notices.push(
      "La recherche par le sens n'est pas configurée : seuls les mots de la question ont été cherchés.",
    );
  } else {
    try {
      [vector] = await albert.embed([question]);
    } catch (error) {
      logFailure("embedding", error);
      notices.push(
        "La recherche par le sens est momentanément indisponible : seuls les mots de la question ont été cherchés.",
      );
    }
  }

  const [textHits, vectorHits] = await Promise.all([
    searchFullText(question, CANDIDATE_COUNT),
    vector === undefined
      ? Promise.resolve([])
      : searchByVector(vector, CANDIDATE_COUNT),
  ]);
  const candidates = fuseRankings([textHits, vectorHits], (hit) => hit.id)
    .slice(0, CANDIDATE_COUNT)
    .map(({ item }) => item);
  if (candidates.length === 0) return { status: "no-results", notices };

  let best = candidates.slice(0, SOURCE_COUNT);
  if (albert !== undefined && vector !== undefined) {
    try {
      const ranked = await albert.rerank(
        question,
        candidates.map((candidate) => candidate.content),
        SOURCE_COUNT,
      );
      best = ranked
        .filter(({ relevanceScore }) => relevanceScore >= MIN_RELEVANCE)
        .map(({ index }) => candidates[index]);
      if (best.length === 0) return { status: "no-results", notices };
    } catch (error) {
      logFailure("reclassement", error);
      notices.push(
        "Le reclassement des passages est momentanément indisponible : ils sont présentés dans l'ordre de la recherche.",
      );
    }
  }
  const sources = best.map((candidate, index) => ({
    ...candidate,
    number: index + 1,
  }));

  if (albert === undefined || vector === undefined) {
    return {
      status: "sources-only",
      reason:
        "La réponse rédigée n'est pas disponible pour le moment. Voici les passages les plus proches de votre question.",
      sources,
      notices,
    };
  }
  try {
    const answer = await albert.chat(buildAnswerMessages(question, sources));
    return {
      status: "answered",
      answer,
      chatModel: chatModelName(),
      sources,
      notices,
    };
  } catch (error) {
    logFailure("génération", error);
    return {
      status: "sources-only",
      reason:
        "Le service de rédaction des réponses est momentanément indisponible. Voici les passages les plus proches de votre question.",
      sources,
      notices,
    };
  }
}
