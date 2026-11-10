create extension if not exists vector;

create table if not exists cahiers (
  id text primary key,
  code_insee text not null,
  commune text not null,
  departement text not null,
  region text not null,
  date_ouverture date not null,
  cle_scan text not null,
  cle_transcription text not null,
  transcription text not null,
  importe_le timestamptz not null default now()
);

create table if not exists chunks (
  id bigserial primary key,
  cahier_id text not null references cahiers (id) on delete cascade,
  ordre int not null,
  contenu text not null,
  recherche tsvector generated always as (to_tsvector('french', contenu)) stored,
  -- 1024 : dimension supposée de bge-m3, le modèle d'embeddings visé chez Albert. À confirmer.
  embedding vector(1024),
  unique (cahier_id, ordre)
);

create index if not exists chunks_recherche_idx on chunks using gin (recherche);
create index if not exists chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);
create index if not exists cahiers_departement_idx on cahiers (departement);
create index if not exists cahiers_code_insee_idx on cahiers (code_insee);
