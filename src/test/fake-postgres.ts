// Client `postgres` factice pour les tests : remplace le module `postgres`
// via `vi.mock`, enregistre chaque requête SQL produite par Drizzle et
// renvoie les lignes mises en file par `reply`, dans l'ordre des requêtes.
// Une ligne est un tableau de valeurs, dans l'ordre des colonnes du `select`.

export interface RecordedQuery {
  sql: string;
  params: unknown[];
}

export interface FakeClient {
  options: { parsers: object; serializers: object };
  unsafe(
    sql: string,
    params: unknown[],
  ): Promise<unknown[]> & { values(): Promise<unknown[]> };
  begin<T>(transaction: (client: FakeClient) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

export interface FakePostgres {
  connect(url: string): FakeClient;
  reply(...rowSets: unknown[][][]): void;
  reset(): void;
  readonly urls: string[];
  readonly queries: RecordedQuery[];
  readonly ended: boolean;
}

export function createFakePostgres(): FakePostgres {
  const urls: string[] = [];
  const queries: RecordedQuery[] = [];
  const replies: unknown[][][] = [];
  let ended = false;

  const client: FakeClient = {
    options: { parsers: {}, serializers: {} },
    unsafe(sql, params) {
      queries.push({ sql, params });
      const rows = replies.shift() ?? [];
      return Object.assign(Promise.resolve(rows), {
        values: () => Promise.resolve(rows),
      });
    },
    async begin(transaction) {
      queries.push({ sql: "begin", params: [] });
      const result = await transaction(client);
      queries.push({ sql: "commit", params: [] });
      return result;
    },
    async end() {
      ended = true;
    },
  };

  return {
    connect(url) {
      urls.push(url);
      return client;
    },
    reply(...rowSets) {
      replies.push(...rowSets);
    },
    reset() {
      urls.length = 0;
      queries.length = 0;
      replies.length = 0;
      ended = false;
    },
    urls,
    queries,
    get ended() {
      return ended;
    },
  };
}
