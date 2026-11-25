import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  chunks,
  lines,
  municipalities,
  municipalityCodeHistory,
  notebookVersions,
  notebooks,
  pages,
} from "./schema";

type Table =
  | typeof chunks
  | typeof lines
  | typeof municipalityCodeHistory
  | typeof notebookVersions
  | typeof notebooks
  | typeof pages;

function foreignKeys(table: Table) {
  return getTableConfig(table).foreignKeys.map((foreignKey) => {
    const reference = foreignKey.reference();
    return {
      columns: reference.columns.map(({ name }) => name),
      table: getTableConfig(reference.foreignTable).name,
      foreignColumns: reference.foreignColumns.map(({ name }) => name),
      onDelete: foreignKey.onDelete,
    };
  });
}

describe("chunks", () => {
  const config = getTableConfig(chunks);

  it("rattache chaque chunk à son cahier et, s'il est connu, à sa page", () => {
    expect(foreignKeys(chunks)).toEqual([
      {
        columns: ["notebook_id"],
        table: "notebooks",
        foreignColumns: ["id"],
        onDelete: "cascade",
      },
      {
        columns: ["notebook_id", "page"],
        table: "pages",
        foreignColumns: ["notebook_id", "number"],
        onDelete: "cascade",
      },
    ]);
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

describe("notebooks", () => {
  it("pointe la version en ligne vers l'historique du même cahier", () => {
    expect(foreignKeys(notebooks)).toEqual([
      {
        columns: ["id", "online_version"],
        table: "notebook_versions",
        foreignColumns: ["notebook_id", "version"],
        onDelete: "no action",
      },
    ]);
  });

  it("contraint le statut, le retrait et les modes de transcription", () => {
    expect(getTableConfig(notebooks).checks.map(({ name }) => name)).toEqual([
      "notebooks_status_check",
      "notebooks_withdrawal_reason_check",
      "notebooks_withdrawal_check",
      "notebooks_typed_transcription_check",
      "notebooks_handwritten_transcription_check",
    ]);
  });
});

describe("notebook_versions", () => {
  it("garde l'historique d'un cahier même s'il est supprimé", () => {
    expect(
      foreignKeys(notebookVersions).map(({ table, onDelete }) => [
        table,
        onDelete,
      ]),
    ).toEqual([
      ["notebooks", "no action"],
      ["deliveries", "no action"],
    ]);
  });
});

describe("pages et lignes", () => {
  it("supprime les pages avec le cahier et les lignes avec la page", () => {
    expect(foreignKeys(pages)[0]).toMatchObject({
      table: "notebooks",
      onDelete: "cascade",
    });
    expect(foreignKeys(lines)).toEqual([
      {
        columns: ["notebook_id", "page"],
        table: "pages",
        foreignColumns: ["notebook_id", "number"],
        onDelete: "cascade",
      },
    ]);
  });

  it("indexe le texte de chaque page pour la recherche plein texte", () => {
    const config = getTableConfig(pages);

    expect(
      config.indexes.map(({ config: { name, method } }) => [name, method]),
    ).toEqual([["pages_search_idx", "gin"]]);
    expect(
      config.columns.find(({ name }) => name === "search")?.getSQLType(),
    ).toBe("tsvector");
  });
});

describe("référentiel géographique", () => {
  it("cherche les communes par préfixe du nom normalisé", () => {
    const [index] = getTableConfig(municipalities).indexes;

    expect(index.config.name).toBe("municipalities_search_name_idx");
    expect(
      index.config.columns.map((column) =>
        "indexConfig" in column ? column.indexConfig?.opClass : undefined,
      ),
    ).toEqual(["text_pattern_ops"]);
  });

  it("fait pointer un ancien code vers une commune actuelle", () => {
    expect(foreignKeys(municipalityCodeHistory)).toEqual([
      {
        columns: ["current_code"],
        table: "municipalities",
        foreignColumns: ["insee_code"],
        onDelete: "cascade",
      },
    ]);
  });
});
