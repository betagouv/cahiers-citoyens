# Phase 7 : le job `ingest` de bout en bout

[← Vue d'ensemble](overview.md)

## Objectif

Le cron relève `incoming/` et mène chaque dépôt jusqu'à `applied` ou `rejected`, sans intervention humaine.

## Changements

- `src/ingestion/job.ts` prend un verrou consultatif Postgres (une seule exécution à la fois), puis traite les ZIP de `incoming/` par ordre de nom, c'est-à-dire par ordre chronologique grâce à l'horodatage. Sur S3, un objet n'apparaît qu'une fois son envoi terminé : tout ZIP présent est complet.
- Chaque ZIP est déplacé de `incoming/` vers `deliveries/` (zone interne), puis téléchargé dans un fichier temporaire du conteneur.
- La vectorisation des nouveaux chunks (logique de `scripts/embed.ts`) tourne à la fin du job. Si Albert ne répond pas, le dépôt reste `applied` : la recherche plein texte fonctionne déjà, et le job suivant reprend les chunks restants.
- Un dépôt `failed` est relancé au job suivant, au plus N fois. Au-delà, il déclenche une alerte.
- Un point d'entrée en ligne de commande : `ingest run` (utilisé par le cron) et `ingest withdraw <id> --reason …`.
- Supprimer `scripts/load.ts`. Les faux cahiers passent désormais par un dépôt factice déposé dans `incoming/`.

## Données

- `JobRun { startedAt; finishedAt; deliveries: { name; from; to }[] }`, journalisé en JSON sur une ligne.

## Vérification

- Statique : `check`, `lint`, `test`.
- Exécution : le scénario de la section 8 du protocole contre un S3 local (MinIO), avec les ZIP de la phase 3 déposés l'un après l'autre. Puis le même scénario en recette.
