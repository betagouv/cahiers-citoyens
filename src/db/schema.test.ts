import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { chunks, notebooks } from "./schema";

describe("chunks", () => {
  const config = getTableConfig(chunks);

  it("rattache chaque chunk à son cahier, supprimé avec lui", () => {
    const [foreignKey] = config.foreignKeys;
    const reference = foreignKey.reference();

    expect(config.foreignKeys).toHaveLength(1);
    expect(reference.columns.map(({ name }) => name)).toEqual(["notebook_id"]);
    expect(reference.foreignTable).toBe(notebooks);
    expect(reference.foreignColumns.map(({ name }) => name)).toEqual(["id"]);
    expect(foreignKey.onDelete).toBe("cascade");
  });

  it("indexe le texte (GIN) et les vecteurs (HNSW, cosinus)", () => {
    expect(
      config.indexes.map(({ config: { name, method } }) => [name, method]),
    ).toEqual([
      ["chunks_search_idx", "gin"],
      ["chunks_embedding_idx", "hnsw"],
    ]);
    expect(config.uniqueConstraints.map(({ name }) => name)).toEqual([
      "chunks_notebook_id_position_key",
    ]);
  });

  it("déclare la colonne de recherche en tsvector", () => {
    const search = config.columns.find(({ name }) => name === "search");

    expect(search?.getSQLType()).toBe("tsvector");
  });
});
