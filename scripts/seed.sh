#!/bin/sh
# `db:seed` : remplit le référentiel géographique dans tout environnement.
# Bun en local, Node sur Scalingo (pas de Bun) avec le job compilé par le build.
# `--with-fake-notebooks` publie en plus 10 faux cahiers : poste local seulement.
set -e
cd "$(dirname "$0")/.."

fake=false
for arg do
  shift
  if [ "$arg" = "--with-fake-notebooks" ]; then
    fake=true
  else
    set -- "$@" "$arg"
  fi
done

if ! command -v bun >/dev/null 2>&1; then
  if [ "$fake" = true ]; then
    echo "--with-fake-notebooks demande Bun : réservé au poste local." >&2
    exit 1
  fi
  exec node dist/jobs/load-geography.mjs "$@"
fi

if [ "$fake" = true ] && [ "$NODE_ENV" = production ]; then
  echo "--with-fake-notebooks est refusé avec NODE_ENV=production." >&2
  exit 1
fi

bun scripts/load-geography.ts "$@"
[ "$fake" = true ] || exit 0

# Même chemin que les vrais dépôts : un ZIP dans incoming/, puis le job ingest.
bun scripts/fake-data/deliver.ts --count 10 --out "${LOCAL_BUCKET_DIR:-data/bucket}/incoming"
exec bun scripts/ingest-local.ts run
