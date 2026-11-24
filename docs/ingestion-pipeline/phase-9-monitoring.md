# Phase 9 : monitoring (rapports, alertes, tableau de bord)

[← Vue d'ensemble](overview.md)

## Objectif

Condorcet sait ce qu'est devenu chaque dépôt. L'équipe est prévenue quand quelque chose coince. L'état de la pipeline et du corpus se lit sur une page.

## Changements

- **Rapport.** À chaque transition finale, le job écrit `reports/<nom du ZIP>.json` au format de la section 7 du protocole : statut, compteurs publiés, remplacés et inchangés, erreurs avec cahier, fichier, page et code. Condorcet le lit avec sa clé.
- **Alertes.** Un webhook (canal à décider) en cas de :
  - dépôt `rejected` ;
  - `failed` après N tentatives ;
  - archive présente dans `incoming/` depuis plus de 30 min ;
  - cron qui ne s'est pas exécuté depuis plus de 15 min ;
  - chunks sans embedding depuis plus de 24 h.
- **Santé.** `/api/health` ajoute la date du dernier passage du job et le nombre de dépôts en attente, pour que l'outil de supervision puisse alerter sans accès à la base.
- **Tableau de bord interne.** `/admin/ingestion`, protégé : la liste des dépôts et leur statut, le détail d'un dépôt (erreurs, changements), puis les indicateurs : cahiers publiés et retirés, pages, répartition par `pipeline_release`, publications, remplacements et retraits par période, motifs de retrait, part des cahiers remplacés lors d'un changement de `pipeline_release`.

## Données

- `DeliveryReport`, sérialisé en JSON, avec un `schema_version` à part pour pouvoir le faire évoluer.
- Les indicateurs se calculent en SQL sur `deliveries` et `notebook_versions`. Pas de table de statistiques en double.

## Vérification

- Statique : `check`, `lint`, `test`, `build`.
- Exécution : avec un dépôt défectueux, on obtient un rapport `rejected` dans le bucket et une alerte reçue. En bloquant l'accès à la base, on obtient `failed`, puis une alerte au N-ième essai. `verify-notebooks` sur `/admin/ingestion`, avec une nouvelle fiche `features/admin-ingestion.md`.
