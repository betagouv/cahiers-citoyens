# Cahiers : liste et page d'un cahier

`/notebooks` liste les cahiers publiés (`notebooks.status = 'published'`) dans un tableau DSFR paginé (20 par page). `/notebooks/<id>` affiche chaque page du cahier : son image à gauche, sa transcription à droite ; sous 768 px de large, l'image passe au-dessus du texte. Les images viennent de `/notebooks/<id>/pages/<n>?v=<version>`, qui les lit dans le bucket privé (`src/lib/s3-storage.ts`), ou dans `LOCAL_BUCKET_DIR` en local (`src/lib/local-bucket.ts`). Les pages lisent la base à chaque requête (`src/lib/notebooks.ts`, `src/lib/page-image.ts`).

## Sub-features

- `notebooks-list` : tableau `Cahier` / `Commune` / `Pages`, un lien par cahier, total et page courante au-dessus. `Commune` vaut `Charolles (71)`, ou `Non renseignée` pour un cahier chargé avant les dépôts.
- `notebooks-pagination` : pagination DSFR dès plus de 20 cahiers ; `?page=` hors bornes ou invalide ramène à une page existante.
- `notebook-viewer` : fil d'Ariane, titre `<commune> (<dép.>) : cahier citoyen` (`Cahier <id>` sans commune), `<département> · <n> pages`, identifiant du cahier, index `Aller à une page` (dès 2 pages), puis une section par page : titre `Page <n>` (niveau 2), image avec `width`/`height` et l'alternative `Image numérisée de la page <n>, transcrite à la suite`, lien `Ouvrir l'image de la page <n> en grand`, transcription (`Aucun texte transcrit sur cette page.` pour une page blanche). Titre d'onglet `<commune> (<dép.>) : cahier citoyen | Cahiers citoyens`, avec une `meta description`.
- `notebook-anchors` : chaque section porte l'ancre `#page-<n>`, celle que citent les deux recherches.
- `notebook-lazy-images` : la première image part avec `fetchpriority="high"`, les suivantes avec `loading="lazy"`.
- `notebook-page-image` : `/notebooks/<id>/pages/<n>?v=<version>` répond 200 avec le type de l'image et `Cache-Control: private, max-age=31536000, immutable` ; 404 (`no-store`) sans `v`, pour une autre version que celle en ligne, une page absente ou un cahier retiré.
- `notebook-legacy` : un cahier chargé avant les dépôts (sans `online_version`) affiche `Les pages de ce cahier ne sont pas encore en ligne.`
- `notebook-not-found` : un id inconnu ou un cahier retiré (`withdrawn`) répond 404 avec la page `Page introuvable` de l'application (`src/app/not-found.tsx`), posée par `src/proxy.ts` avant le rendu.

## How to get to it (user POV)

- Lien `Cahiers` de l'en-tête.
- Clic sur un identifiant du tableau.
- Clic sur un résultat de recherche ou une source : la page s'ouvre sur l'ancre de la page citée.

## Driving it with agent-browser

Préconditions : une base Postgres migrée, `LOCAL_BUCKET_DIR=data/bucket` dans `.env.local` (chemin absolu exporté dans le shell pour `--prod`), puis des faux cahiers publiés (voir README, « Ingestion locale ») :

```bash
bun scripts/fake-data/deliver.ts --count 2 --out data/bucket/incoming
DATABASE_URL=… bun scripts/ingest-local.ts run
```

- **Liste.** `agent-browser open "$NOTEBOOKS_BASE_URL/notebooks"`, `wait --load networkidle`, `snapshot` : titre `Les cahiers`, phrase `<N> cahiers, page 1 sur <P>`, colonnes `Cahier`, `Commune`, `Pages`. Confronter `N` à `select count(*) from notebooks where status = 'published'`, et le nombre de pages à `select count(*) from pages where notebook_id = '<id>'`.
- **Pagination.** Avec plus de 20 cahiers : `open "$NOTEBOOKS_BASE_URL/notebooks?page=2"`. `?page=abc` affiche la page 1, `?page=99` la dernière.
- **Page d'un cahier.** `notebooks-verify shot notebook-viewer /notebooks/<id>` : la capture montre les images à gauche et le texte à droite. Le `snapshot` a un `heading` de niveau 1 `<commune> (<dép.>) : cahier citoyen`, la navigation `Aller à une page`, puis un `heading` de niveau 2 `Page <n>` et un `img` par page. `NOTEBOOKS_SHOT_WIDTH=375 notebooks-verify shot notebook-viewer-mobile /notebooks/<id>` : l'image au-dessus du texte, sans défilement horizontal.
- **Ancre.** `agent-browser open "$NOTEBOOKS_BASE_URL/notebooks/<id>#page-3"` : `agent-browser eval 'Math.round(document.getElementById("page-3").getBoundingClientRect().top)'` renvoie une valeur proche de 0.
- **Images au défilement.** `agent-browser eval '[...document.querySelectorAll("section[id^=page-] img")].map(i => i.complete && i.naturalWidth > 0)'` juste après l'ouverture : la première vaut `true`, les dernières `false` tant qu'on n'a pas défilé.
- **Image.** `curl -s -D - -o /dev/null "$NOTEBOOKS_BASE_URL/notebooks/<id>/pages/1?v=1"` : `200`, `content-type: image/jpeg` (ou `image/png`), `cache-control: private, max-age=31536000, immutable`. Sans `?v=1`, ou avec `?v=2` pour un cahier en version 1 : `404`.
- **Retrait.** `DATABASE_URL=… bun scripts/ingest-local.ts withdraw <id> --reason other`, puis, en `--prod` : `/notebooks/<id>` et `/notebooks/<id>/pages/1?v=1` répondent `404`, le cahier n'est plus dans `/notebooks`, ni dans `/search?place=<code INSEE>` (le retrait relance `refresh_search_counts()`).
- **404.** À vérifier en `--prod` : `curl -s -o /dev/null -w "%{http_code}\n" "$NOTEBOOKS_BASE_URL/notebooks/inconnu"` renvoie `404`. Le `snapshot` de la page montre le titre `Page introuvable` et les boutons `Parcourir les cahiers` et `Rechercher dans les cahiers`.

## Gotchas

- **Le 404 se prouve en `--prod`, pas en dev.** Avec Cache Components, le build précalcule l'enveloppe statique de `/notebooks/[id]` et le serveur l'envoie dès la requête : sans `src/proxy.ts`, un id inconnu répondait 200 en standalone (page « introuvable » dans un flux déjà parti en 200), alors que `next dev`, qui ne précalcule rien, répondait bien 404. Constaté le 2026-11-11.
- Un pourcent-encodage invalide (`/notebooks/%E0%A4%A`) répond 500 : c'est le décodage des paramètres par Next, pas le proxy.
- Le retrait supprime les images du bucket, mais un navigateur qui les a déjà chargées les garde en cache (`private, immutable`) : contrôler les 404 avec `curl`, pas en rechargeant l'onglet.
- Le standalone (`--prod`) change de dossier au démarrage : un `LOCAL_BUCKET_DIR` relatif n'y trouve rien et les images répondent 404. Exporter un chemin absolu.
- Sans les variables `S3_*` ni `LOCAL_BUCKET_DIR`, la page s'affiche mais les images répondent `503 Stockage des images non configuré`.
- Le standalone ne transmet pas `Content-Length` sur le flux de l'image (réponse chunked), même quand le stockage la donne : ce n'est pas un défaut de la route.
- Les images sont servies telles que livrées (`unoptimized`) : l'optimiseur de Next garderait en cache une image retirée.
