# Phase 11 : assistant Tchap (alertes, questions, retraits)

[← Vue d'ensemble](overview.md)

## Objectif

L'équipe suit la pipeline et interroge le corpus depuis Tchap, sans ouvrir le tableau de bord ni lire les logs. Elle peut retirer un cahier depuis Tchap, avec la même trace qu'`ingest withdraw`.

Le bot ne publie rien. La publication reste réservée aux dépôts vérifiés (phases 4 à 7).

## Changements

- **Point d'entrée.** `src/bot/tchap.ts`, compilé par `scripts/build-jobs.mjs` en `dist/jobs/tchap-bot.mjs` comme le job d'ingestion (phase 1), lancé par Node. Nouvelle ligne du `Procfile` : `worker: node dist/jobs/tchap-bot.mjs`.
- **Connexion Matrix.** [`@beeper/chat-adapter-matrix`](https://github.com/beeper/chat-adapter-matrix) (MIT), un adaptateur du Chat SDK construit sur `matrix-js-sdk`. Il synchronise en continu (pas de webhook entrant), chiffre de bout en bout avec une clé de récupération et accepte seul les invitations des comptes autorisés.
- **État persistant en base.** Le disque d'un conteneur Scalingo est effacé à chaque redémarrage. Les clés de chiffrement, l'identifiant d'appareil et l'état de synchronisation vont dans Postgres, via un adaptateur d'état du Chat SDK. Sans cela, le bot perd l'accès aux salons chiffrés à chaque déploiement.
- **Alertes.** Le bot remplace le webhook générique de la phase 9. Il relit `deliveries` à chaque cycle et poste dans le salon de l'équipe chaque transition finale (`applied` avec ses compteurs, `rejected` avec ses erreurs, `failed`) et chaque alerte de la phase 9. Une colonne `notified_at` évite les doublons après un redémarrage.
- **Questions (lecture seule).** Sur mention ou en message privé, une boucle d'agent (modèle servi par Albert) dispose de trois outils :
  - `corpus_stats` : `getCorpusStats`, plus les cahiers retirés et les dépôts par statut ;
  - `search_notebooks` : la recherche hybride de `src/lib/search`, avec citations (cahier, page) ;
  - `query_readonly` : une requête SQL `SELECT` sur une connexion dont le rôle Postgres n'a que le droit de lecture, avec un délai maximal et un nombre de lignes plafonné.
- **Actions (avec confirmation).** `withdraw_notebook(id, motif)` et `delivery_details(nom du ZIP)`. Un outil d'écriture n'agit jamais directement : le bot poste un aperçu (cahier, motif, conséquences) et attend une réaction ✅ d'un membre autorisé. Le retrait appelle la même fonction que la commande `ingest withdraw` de la phase 8.
- **Droits.** Deux listes en variables d'environnement : les salons où le bot répond, les comptes qui peuvent confirmer une action. Hors de ces listes, le bot ignore le message.
- **Journal.** Chaque demande, confirmation et action est inscrite dans `bot_audit` : compte, salon, outil, paramètres, résultat, date. Le texte des questions n'est pas conservé au-delà de la durée fixée (voir « Décisions ouvertes »).

## Données

- `bot_audit` : `(id, at, matrix_user, room, tool, params jsonb, outcome, confirmed_by)`.
- `bot_state` : clé et valeur, pour l'adaptateur d'état (clés de chiffrement, synchronisation).
- `deliveries.notified_at`.
- Un rôle Postgres en lecture seule, créé par une migration personnalisée, comme `0000_enable-vector.sql`.

## Alternatives

| Forme                                                      | Pour                                                             | Contre                                                                             | Choix      |
| ---------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| Processus `worker` dans ce dépôt                           | Réutilise le schéma, la recherche et le retrait ; un déploiement | Un conteneur payé en permanence                                                    | **Retenu** |
| Alertes seules, envoyées par le cron `ingest`              | Pas de conteneur en plus                                         | Écrire dans un salon chiffré demande tout l'état de chiffrement ; pas de questions | Non        |
| Dépôt séparé qui appelle une API de l'application          | Bot réutilisable ailleurs                                        | Une API à écrire, versionner et protéger pour un seul client                       | Non        |
| Connecteur Mattermost ou Matrix d'un outil existant (nao…) | Interface et historique fournis                                  | Pas de Matrix aujourd'hui ; ne connaît ni les dépôts ni les retraits               | Non        |

Le refus d'un `worker` pour l'ingestion (vue d'ensemble) tenait à la latence : un dépôt ne justifie pas un conteneur permanent. Ici, le conteneur sert à tenir la connexion Matrix, que rien d'autre ne fournit.

## Vérification

- Avant tout le reste, une preuve hors du dépôt : sous Node, avec un compte Tchap de test, le bot lit un message dans un salon chiffré et y répond, puis le fait encore après un redémarrage avec l'état en base.
- Statique : `check`, `lint`, `test`, `build`. Les outils se testent sans Matrix : entrée, appel au domaine, sortie.
- Exécution, sur un salon Tchap de recette :
  - un dépôt défectueux produit une alerte `rejected` avec ses erreurs, une seule fois, même après un redémarrage ;
  - une question sur le corpus reçoit une réponse qui cite cahier et page ;
  - `query_readonly` refuse une écriture au niveau de Postgres, pas seulement dans le code ;
  - un retrait demandé par un compte non autorisé n'aboutit pas ; confirmé par un compte autorisé, le cahier répond 404 et apparaît dans `bot_audit`.

## Décisions ouvertes

- **Compte du bot.** Compte de service Tchap dédié : qui le demande, auprès de qui ?
- **Modèle.** Albert pour la boucle d'agent : quel modèle sait appeler des outils de façon fiable ?
- **Conservation.** Combien de temps garder les questions et réponses dans `bot_audit` ?
- **Salons.** Un salon d'alertes séparé du salon de questions, ou un seul ?

## Consignes d'implémentation

- Dépend des phases 5 (statuts, `deliveries`), 8 (retrait) et 9 (alertes). Les questions sur le corpus peuvent arriver avant, sur le schéma actuel.
- Le skill `architect` sur la forme des outils et du circuit de confirmation, `interrogate` sur les droits et le rôle en lecture seule avant merge.
- Aucun identifiant de salon, de compte ni de serveur dans le code, la doc ou les commits : tout passe par les variables d'environnement.
