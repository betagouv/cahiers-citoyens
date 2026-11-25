export type Fetch = typeof fetch;

async function fetchOk(fetchImpl: Fetch, url: string): Promise<Response> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`${url} a répondu ${response.status}`);
  }
  return response;
}

export async function fetchJson(
  fetchImpl: Fetch,
  url: string,
): Promise<unknown> {
  const response = await fetchOk(fetchImpl, url);
  const body: unknown = await response.json();
  return body;
}

export async function fetchText(
  fetchImpl: Fetch,
  url: string,
): Promise<string> {
  const response = await fetchOk(fetchImpl, url);
  return response.text();
}
