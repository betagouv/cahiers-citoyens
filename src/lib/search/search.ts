import type { AlbertClient } from "../albert";
import { chatModelName, getAlbert } from "./albert-config";
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

// Albert configuré et question vectorisée : reclassement et réponse possibles.
interface SemanticSearch {
  albert: AlbertClient;
  vector: number[];
}

// `?q=` vient de l'URL : espaces normalisés, longueur bornée.
export function parseQuestion(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_LENGTH);
}

function logFailure(stage: string, error: unknown) {
  console.error(`Recherche : ${stage} en échec`, error);
}

async function embedQuestion(
  question: string,
  notices: string[],
): Promise<SemanticSearch | undefined> {
  const albert = getAlbert();
  if (albert === undefined) {
    notices.push(
      "La recherche par le sens n'est pas configurée : seuls les mots de la question ont été cherchés.",
    );
    return undefined;
  }
  try {
    const [vector] = await albert.embed([question]);
    return { albert, vector };
  } catch (error) {
    logFailure("embedding", error);
    notices.push(
      "La recherche par le sens est momentanément indisponible : seuls les mots de la question ont été cherchés.",
    );
    return undefined;
  }
}

// Recherche hybride : plein texte et vecteurs, fusionnés par RRF.
async function findCandidates(
  question: string,
  semantic: SemanticSearch | undefined,
): Promise<Candidate[]> {
  const [textHits, vectorHits] = await Promise.all([
    searchFullText(question, CANDIDATE_COUNT),
    semantic === undefined
      ? Promise.resolve([])
      : searchByVector(semantic.vector, CANDIDATE_COUNT),
  ]);
  return fuseRankings([textHits, vectorHits], (hit) => hit.id)
    .slice(0, CANDIDATE_COUNT)
    .map(({ item }) => item);
}

// Reclassement des candidats ; sans Albert ou s'il échoue, l'ordre RRF.
async function selectBest(
  question: string,
  candidates: Candidate[],
  semantic: SemanticSearch | undefined,
  notices: string[],
): Promise<Candidate[]> {
  const fallback = candidates.slice(0, SOURCE_COUNT);
  if (semantic === undefined) return fallback;
  try {
    const ranked = await semantic.albert.rerank(
      question,
      candidates.map((candidate) => candidate.content),
      SOURCE_COUNT,
    );
    return ranked
      .filter(({ relevanceScore }) => relevanceScore >= MIN_RELEVANCE)
      .map(({ index }) => candidates[index]);
  } catch (error) {
    logFailure("reclassement", error);
    notices.push(
      "Le reclassement des passages est momentanément indisponible : ils sont présentés dans l'ordre de la recherche.",
    );
    return fallback;
  }
}

async function answerFromSources(
  question: string,
  sources: Source[],
  semantic: SemanticSearch | undefined,
  notices: string[],
): Promise<SearchOutcome> {
  if (semantic === undefined) {
    return {
      status: "sources-only",
      reason:
        "La réponse rédigée n'est pas disponible pour le moment. Voici les passages les plus proches de votre question.",
      sources,
      notices,
    };
  }
  try {
    const answer = await semantic.albert.chat(
      buildAnswerMessages(question, sources),
    );
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

// Embedding de la question, recherche hybride, reclassement, puis réponse
// rédigée à partir des 5 meilleurs passages. Chaque appel à Albert peut
// échouer sans faire tomber la page : on se replie sur ce qui reste (plein
// texte seul, ordre RRF, sources sans réponse) et on le signale.
export async function searchNotebooks(
  question: string,
): Promise<SearchOutcome> {
  const notices: string[] = [];
  const semantic = await embedQuestion(question, notices);
  const candidates = await findCandidates(question, semantic);
  if (candidates.length === 0) return { status: "no-results", notices };
  const best = await selectBest(question, candidates, semantic, notices);
  if (best.length === 0) return { status: "no-results", notices };
  const sources = best.map((candidate, index) => ({
    ...candidate,
    number: index + 1,
  }));
  return answerFromSources(question, sources, semantic, notices);
}
