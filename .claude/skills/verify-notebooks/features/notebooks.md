# Cahiers : liste et visionneuse

`/notebooks` liste les cahiers chargés en base dans un tableau DSFR paginé (20 par page). `/notebooks/<id>` affiche côte à côte le scan PDF, servi par `/notebooks/<id>/scan`, et la transcription ; sous 992 px de large, les deux blocs s'empilent. Les pages lisent la base à chaque requête (`src/lib/notebooks.ts`), le scan vient du bucket privé (`src/lib/scan-storage.ts`).

## Sub-features

- `notebooks-list` : tableau `Cahier` / `Ouvert le` / `Passages indexés`, un lien par cahier, total et page courante au-dessus.
- `notebooks-pagination` : pagination DSFR dès plus de 20 cahiers ; `?page=` hors bornes ou invalide ramène à une page existante.
- `notebook-viewer` : fil d'Ariane, titre `Cahier <id>`, date d'ouverture, nombre de passages, iframe du scan, bouton `Ouvrir le PDF`, transcription défilable.
- `notebook-scan` : `/notebooks/<id>/scan` relaie le PDF du bucket (200 `application/pdf`, 206 sur `Range`).
- `notebook-not-found` : un id inconnu répond 404 avec la page `Cahier introuvable` ; `/notebooks/<inconnu>/scan` répond 404.

## How to get to it (user POV)

- Lien `Parcourir les cahiers` de l'accueil, ou `/notebooks` directement.
- Clic sur un identifiant du tableau.

## Driving it with agent-browser

Préconditions : une base Postgres migrée et chargée (`scripts/load.ts`), `DATABASE_URL` et les variables `S3_*` dans `.env.local` (voir README, « Consulter les cahiers »). Les faux cahiers du bucket sous `fake-data/` correspondent à `generate.ts --seed 42`.

- **Liste.** `agent-browser open "$NOTEBOOKS_BASE_URL/notebooks"`, `wait --load networkidle`, `snapshot` : titre `Les cahiers`, phrase `<N> cahiers, page 1 sur <P>`, tableau avec `notebook-0001` en tête. Confronter `N` à `select count(*) from notebooks`.
- **Pagination.** Avec 30 cahiers : `open "$NOTEBOOKS_BASE_URL/notebooks?page=2"`, le tableau commence à `notebook-0021`. `?page=abc` affiche la page 1, `?page=99` la dernière.
- **Visionneuse.** `notebooks-verify shot notebook-viewer /notebooks/notebook-0001` : la capture montre la visionneuse PDF de Chrome (barre `1 / 6`) à gauche et la transcription à droite.
- **Scan.** `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "$NOTEBOOKS_BASE_URL/notebooks/notebook-0001/scan"` renvoie `200 application/pdf` ; avec `-H "Range: bytes=0-99"`, `206` et `content-range: bytes 0-99/<taille>`.
- **404.** `curl -s -o /dev/null -w "%{http_code}\n" "$NOTEBOOKS_BASE_URL/notebooks/inconnu"` renvoie `404` ; `snapshot` de la page montre `Cahier introuvable`.

## Gotchas

- Le stockage répond `X-Frame-Options: SAMEORIGIN` : une redirection vers une URL présignée afficherait une icône de document cassé dans l'iframe. D'où le proxy ; ne pas « optimiser » en redirection.
- `next dev` ne transmet pas `Content-Length` sur le flux du scan (réponse chunked) : ce n'est pas un défaut du proxy.
- Le nombre affiché est celui des passages (chunks) servant à la recherche : un par contribution, plus un par tranche de 400 mots pour une contribution longue. Avec les faux cahiers, `notebook-0001` a 13 contributions et 13 passages. Une base chargée avant ce découpage montre moins de passages : relancer `scripts/load.ts` puis `scripts/embed.ts`.
- Sans les variables `S3_*`, la page s'affiche mais l'iframe reçoit `503 Stockage des scans non configuré`.
