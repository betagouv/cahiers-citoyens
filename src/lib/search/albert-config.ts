import {
  type AlbertClient,
  DEFAULT_CHAT_MODEL,
  createAlbertClient,
} from "../albert";

export function chatModelName(): string {
  return process.env.ALBERT_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

// `undefined` sans ALBERT_API_KEY : la recherche se replie sur le plein texte.
export function getAlbert(): AlbertClient | undefined {
  const apiKey = process.env.ALBERT_API_KEY;
  if (!apiKey) return undefined;
  return createAlbertClient({
    apiKey,
    baseUrl: process.env.ALBERT_BASE_URL || undefined,
    chatModel: chatModelName(),
  });
}
