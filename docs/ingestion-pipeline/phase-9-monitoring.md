# Phase 9 : monitoring (rapports, alertes, santé)

[← Vue d'ensemble](overview.md)

## Objectif

Condorcet sait ce qu'est devenu chaque dépôt. L'équipe est prévenue quand quelque chose coince. L'outil de supervision lit l'état du job sans accès à la base.

Le tableau de bord interne `/admin/ingestion` est reporté (voir la fin).

## Modules (`src/ingestion/`, sauf mention)

| Module                 | Rôle                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `delivery-report.ts`   | Type `DeliveryReport` (`schema_version` à part), clés `reports/<nom>.json` et `.duplicate.json`, rapport d'un renvoi. |
| `report-rows.ts`       | Dépôts finis sans rapport (`deliveries.reported_at` vide), et la date du rapport.                                     |
| `report-deliveries.ts` | Écrit le rapport de chaque dépôt fini, le note en base, alerte sur un refus ou un abandon.                            |
| `alert.ts`             | `createAlerter` : une ligne JSON sur la sortie d'erreur, puis un POST au webhook s'il est configuré. Ne lève jamais.  |
| `delivery-alerts.ts`   | Textes des alertes `delivery.rejected` et `delivery.failed`.                                                          |
| `alert-notices.ts`     | Une alerte répétée part au plus une fois par jour (`alert_notices`).                                                  |
| `stale-incoming.ts`    | Alerte sur un ZIP resté plus de 30 min dans `incoming/`.                                                              |
| `unembedded-chunks.ts` | Alerte sur des chunks sans embedding depuis plus de 24 h.                                                             |
| `monitor-run.ts`       | Fin du job : rapports, puis les deux surveillances ; chaque étape court même si la précédente échoue.                 |
| `job-runs.ts`          | Dernier passage de chaque job (`job_runs`).                                                                           |
| `src/lib/health/`      | `readIngestHealth` : dernier passage, dépôts en attente, statut.                                                      |
| `src/app/api/health/`  | La route `/api/health`.                                                                                               |

`ObjectStore` gagne `modifiedAt` (date d'un objet) et `writeJson`, en S3 comme sur le dossier local.

## Déroulé, à la suite de la phase 7

1. Réception : un ZIP dont le nom est déjà `applied` ou `rejected` est refusé. Le job écrit `reports/<nom>.duplicate.json` (`rejected`, erreur `duplicate-delivery-name`), puis supprime le ZIP de `incoming/` et alerte. Le rapport d'origine reste. Le nom part dans `JobRun.duplicates`, pas dans `errors` : l'erreur vient de l'envoi, pas du job.
2. Traitement et vectorisation, inchangés.
3. Rapports : pour chaque dépôt `applied`, `rejected`, ou `failed` à 3 tentatives, sans `reported_at`, le job écrit `reports/<nom>.json`, remplit `reported_at`, puis alerte s'il est refusé ou abandonné. Le rapport ne dépend que de la ligne en base : un échec avant `reported_at` fait réécrire le même fichier au job suivant.
4. Surveillance : ZIP de `incoming/` plus vieux que 30 min (`HeadObject`), chunks sans embedding créés il y a plus de 24 h.
5. Le job note son passage dans `job_runs` (sauf s'il est sorti sur le verrou).

## Alertes

`ALERT_WEBHOOK_URL`, optionnelle, reçoit un POST JSON `{ text, event, details }`. `text` suffit à Mattermost, Slack ou un bot Tchap. Sans elle, l'alerte n'est qu'une ligne `{"event":"ingest.alert", …}` sur la sortie d'erreur. Un webhook en erreur ou injoignable laisse une ligne `ingest.alert-failed`, et le job continue.

| `event`             | Déclencheur                                  | Répétition                                   |
| ------------------- | -------------------------------------------- | -------------------------------------------- |
| `delivery.rejected` | Dépôt refusé, ou renvoi d'un nom déjà traité | Une fois, avec le rapport                    |
| `delivery.failed`   | `failed` après 3 tentatives (`MAX_ATTEMPTS`) | Une fois, avec le rapport                    |
| `incoming.stale`    | ZIP dans `incoming/` depuis plus de 30 min   | Une fois par jour et par ZIP                 |
| `chunks.unembedded` | Chunks sans embedding depuis plus de 24 h    | Une fois par jour ; réarmée quand tout passe |

Le cron arrêté ne peut pas s'alerter lui-même : c'est `/api/health` qui le montre.

## Santé

`GET /api/health`, sans cache :

```json
{
  "status": "ok",
  "ingest": { "lastRunAt": "2026-11-26T10:40:29.813Z", "pendingDeliveries": 0 }
}
```

- `status` passe à `degraded` si le job n'a pas fini de passage depuis 15 min, ou jamais. La réponse reste 200 : le site sert ses pages. L'outil de supervision alerte sur `"status":"degraded"`.
- Base injoignable : 503 et `{"status":"error"}`. Le message d'erreur va aux logs du serveur, jamais dans la réponse. Aucun hôte, bucket ni identifiant n'y figure.
- `pendingDeliveries` compte les dépôts que le prochain job traitera (en cours, ou `failed` relançables).

Le harnais `verify-notebooks` accepte `ok` comme `degraded` : en local, le job ne tourne pas.

## Données

Migration `drizzle/0007_delivery-reports.sql`, additive :

- `deliveries.reported_at` : date d'écriture du rapport.
- `chunks.created_at` (`now()` par défaut ; les chunks existants prennent la date de la migration).
- `job_runs (job, started_at, finished_at, error_count)` : une ligne par job.
- `alert_notices (key, sent_at)` : dernier envoi de chaque alerte répétée.

## Décisions

- **Rapport au statut final, pas à la transition.** Le job écrit les rapports manquants à chaque passage, au lieu de les écrire dans `processDelivery`. Un rapport perdu (stockage en panne) est rattrapé, et `failed` définitif, atteint en plusieurs jobs, se traite comme les autres.
- **Message d'échec gardé chez nous.** Le rapport `failed` porte un message générique : `deliveries.failure` peut citer un hôte ou une requête. L'alerte, interne, le donne.
- **Pas de compteur de retraits.** Un dépôt ne retire aucun cahier (protocole, section 6). Un cahier retiré puis renvoyé compte dans `published`.
- **Déploiement.** Les dépôts terminés avant la migration n'ont pas de `reported_at` : le premier passage écrit leur rapport et alerte sur ceux refusés ou abandonnés.

## Vérification

- Statique : `check`, `lint`, `test` (100 %), `build`, `db:generate` sans écart.
- Exécution, contre un Postgres 16 local migré (embeddings en `text`), un bucket en dossier et un faux webhook local :
  - dépôt de 2 cahiers : rapport `applied`, 2 publiés ;
  - dépôt défectueux : rapport `rejected` avec ses erreurs, alerte reçue ;
  - renvoi du premier ZIP : `.duplicate.json` avec `duplicate-delivery-name`, rapport d'origine intact, alerte reçue ;
  - dépôt `failed` à 3 tentatives : rapport `failed`, alerte ;
  - ZIP bloqué dans `incoming/` depuis 2 h et chunks vieux de 2 jours : une alerte chacun, aucune au passage suivant ;
  - webhook arrêté : ligne `ingest.alert-failed`, le job finit ;
  - `/api/health` sur le build standalone : `ok`, puis `degraded` avec un dernier passage vieux de 20 min, puis 503 `{"status":"error"}` base arrêtée.

## Reste

- **Tableau de bord `/admin/ingestion`**, reporté : liste des dépôts et leur statut, détail d'un dépôt (erreurs, changements), indicateurs calculés en SQL sur `deliveries` et `notebook_versions` (cahiers publiés et retirés, pages, répartition par `schema_version`, publications, remplacements et retraits par période, motifs de retrait). Il demande une authentification, absente du site aujourd'hui.
- Choisir le canal du webhook et brancher l'outil de supervision sur `/api/health`.
- Le scénario contre le vrai bucket : droit `HeadObject` et `PutObject` sous `reports/` pour la clé du job, lecture de `reports/` pour la clé de Condorcet.
