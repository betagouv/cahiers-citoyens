# Cahiers : liste et visionneuse

`/notebooks` liste les cahiers publiés (`notebooks.status = 'published'`) dans un tableau DSFR paginé (20 par page). `/notebooks/<id>` affiche côte à côte le scan PDF, servi par `/notebooks/<id>/scan`, et la transcription ; sous 992 px de large, les deux blocs s'empilent. Les pages lisent la base à chaque requête (`src/lib/notebooks.ts`), le scan vient du bucket privé (`src/lib/scan-storage.ts`).

## Sub-features

- `notebooks-list` : tableau `Cahier` / `Ouvert le` / `Passages indexés`, un lien par cahier, total et page courante au-dessus.
- `notebooks-pagination` : pagination DSFR dès plus de 20 cahiers ; `?page=` hors bornes ou invalide ramène à une page existante.
- `notebook-viewer` : fil d'Ariane, titre `Cahier <id>`, date d'ouverture, nombre de passages, iframe du scan, bouton `Ouvrir le PDF`, transcription défilable.
- `notebook-scan` : `/notebooks/<id>/scan` relaie le PDF du bucket (200 `application/pdf`, 206 sur `Range`).
- `notebook-from-delivery` : un cahier venu d'un dépôt (phase 6) n'a ni date d'ouverture, ni scan, ni transcription d'un bloc : `Ouvert le` vaut `Non renseignée` dans le tableau, la visionneuse n'affiche que le titre et le nombre de passages, `/notebooks/<id>/scan` répond 404. Ses pages en images arrivent en phase 8. Pour en obtenir un en local : `bun scripts/fake-data/deliver.ts --count 2 --out data/bucket/incoming`, puis `bun scripts/ingest-local.ts run` (voir README, « Ingestion locale »).
- `notebook-not-found` : un id inconnu ou un cahier retiré (`withdrawn`) répond 404 avec la page `Page introuvable` de l'application (`src/app/not-found.tsx`), posée par `src/proxy.ts` avant le rendu ; `/notebooks/<inconnu>/scan` répond 404.

## How to get to it (user POV)

- Lien `Cahiers` de l'en-tête, ou bouton `Parcourir les cahiers` de l'accueil.
- Clic sur un identifiant du tableau.

## Driving it with agent-browser

Préconditions : une base Postgres migrée et chargée (`scripts/load.ts`), `DATABASE_URL` et les variables `S3_*` dans `.env.local` (voir README, « Consulter les cahiers »). Les faux cahiers du bucket sous `fake-data/` correspondent à `generate.ts --seed 42`.

- **Liste.** `agent-browser open "$NOTEBOOKS_BASE_URL/notebooks"`, `wait --load networkidle`, `snapshot` : titre `Les cahiers`, phrase `<N> cahiers, page 1 sur <P>`, tableau avec `notebook-0001` en tête. Confronter `N` à `select count(*) from notebooks`.
- **Pagination.** Avec 30 cahiers : `open "$NOTEBOOKS_BASE_URL/notebooks?page=2"`, le tableau commence à `notebook-0021`. `?page=abc` affiche la page 1, `?page=99` la dernière.
- **Visionneuse.** `notebooks-verify shot notebook-viewer /notebooks/notebook-0001` : la capture montre la visionneuse PDF de Chrome (barre `1 / 6`) à gauche et la transcription à droite.
- **Scan.** `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "$NOTEBOOKS_BASE_URL/notebooks/notebook-0001/scan"` renvoie `200 application/pdf` ; avec `-H "Range: bytes=0-99"`, `206` et `content-range: bytes 0-99/<taille>`.
- **404.** À vérifier en `--prod` : `curl -s -o /dev/null -w "%{http_code}\n" "$NOTEBOOKS_BASE_URL/notebooks/notebook-9999"` renvoie `404`, `notebook-0001` renvoie `200`, `notebook-9999/scan` renvoie `404`. Le `snapshot` de la page montre le titre `Page introuvable` et les boutons `Parcourir les cahiers` et `Rechercher dans les cahiers`.

## Gotchas

- **Le 404 se prouve en `--prod`, pas en dev.** Avec Cache Components, le build précalcule l'enveloppe statique de `/notebooks/[id]` et le serveur l'envoie dès la requête : sans `src/proxy.ts`, un id inconnu répondait 200 en standalone (page « introuvable » dans un flux déjà parti en 200), alors que `next dev`, qui ne précalcule rien, répondait bien 404. Constaté le 2026-11-11.
- Un pourcent-encodage invalide (`/notebooks/%E0%A4%A`) répond 500, comme `/notebooks/%E0%A4%A/scan` : c'est le décodage des paramètres par Next, pas le proxy.
- Le stockage répond `X-Frame-Options: SAMEORIGIN` : une redirection vers une URL présignée afficherait une icône de document cassé dans l'iframe. D'où le proxy ; ne pas « optimiser » en redirection.
- `next dev` ne transmet pas `Content-Length` sur le flux du scan (réponse chunked) : ce n'est pas un défaut du proxy.
- Le nombre affiché est celui des passages (chunks) servant à la recherche : un par contribution, plus un par tranche de 400 mots pour une contribution longue. Avec les faux cahiers, `notebook-0001` a 13 contributions et 13 passages. Une base chargée avant ce découpage montre moins de passages : relancer `scripts/load.ts` puis `scripts/embed.ts`.
- Sans les variables `S3_*`, la page s'affiche mais l'iframe reçoit `503 Stockage des scans non configuré`.
