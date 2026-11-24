# Pipeline d'ingestion des dépôts Condorcet

Plan d'implémentation. Le format des dépôts est décrit dans [../ingestion-protocol.md](../ingestion-protocol.md) : un ZIP horodaté, un dossier par cahier avec `notebook.json` et une image PNG par page.

## Contexte

Condorcet déposera ses archives directement dans le stockage S3 (option 1, retenue le 2026-11-24). Aujourd'hui, `scripts/load.ts` charge des faux cahiers depuis le disque : pas de versions, pas de retrait, un PDF et une transcription d'un seul bloc. Les vrais cahiers arrivent en images PNG, une par page, avec la transcription de chaque page. Il faut une pipeline qui tourne seule en production, qui ne publie qu'un dépôt entièrement vérifié, et dont on voit l'état sans aller lire des logs.

## Scope

Inclus :

- le dépôt S3 (`incoming/`), le déclenchement automatique et le traitement de bout en bout d'un dépôt ;
- les vérifications de la section 4 du protocole ;
- le modèle en base : dépôts, versions successives de chaque cahier, état courant, pages (image et texte) ;
- la publication et le remplacement par dépôt, le retrait par une commande de notre côté, y compris côté site et recherche ;
- le rapport renvoyé à Condorcet, les alertes, un tableau de bord interne ;
- un générateur de faux dépôts conformes, qui sert de base aux tests.

Exclu pour l'instant :

- le rapprochement avec l'inventaire des Archives nationales : on ne l'a pas encore. On le branchera plus tard comme un contrôle supplémentaire (voir Décisions ouvertes) ;
- les indicateurs qui en dépendent (département, commune, catégorie documentaire) ;
- l'évaluation de la qualité de transcription ou d'occultation.

## Contraintes

- Hébergement Scalingo : `web` et `postdeploy` dans le `Procfile`, installation par npm. Les tâches planifiées passent par `cron.json` et tournent dans un conteneur à part.
- Les scripts TypeScript de `scripts/` tournent avec Bun en local, mais il n'y a pas de Bun sur Scalingo. Le job d'ingestion doit être compilé en JavaScript au build, puis lancé par Node 22.
- Le stockage S3 accepte seulement les sommes de contrôle « when required » (voir `src/lib/scan-storage.ts`).
- Les fichiers passent par le serveur (aujourd'hui `/notebooks/<id>/scan`) : le bucket reste privé et l'état en base décide de ce qui est visible.
- Le dépôt est public : aucun nom d'hôte, de bucket ni de clé dans le code, la doc ou les commits.
- Une image PNG par page de scan : un cahier peut peser des centaines de Mo, un dépôt plusieurs Go. Lecture en flux, jamais d'archive entière en mémoire.

## Forme de la pipeline

```
Condorcet ──aws s3 cp──▶ incoming/delivery-AAAA-MM-JJ-HHMM.zip
                              │  cron toutes les 5 min : job `ingest`
                              ▼
   1. claim      verrou Postgres, déplace le ZIP vers deliveries/
   2. verify     pour chaque notebooks/<id>/ : notebook.json, pages 1..n,
                 PNG présents et lisibles, aucun fichier en trop
                 une erreur → dépôt entier refusé
   3. plan       empreinte de chaque cahier : inconnu → publié,
                 identique → rien, différente → remplacé
   4. apply      copie des PNG de la nouvelle version, puis une transaction en base
   5. embed      vectorise les nouveaux chunks (on peut reprendre plus tard)
   6. report     reports/<nom du ZIP>.json + alerte si refus ou échec
```

Le retrait ne passe pas par le ZIP : c'est une commande de notre côté (`ingest withdraw <id> --reason …`).

Chaque dépôt suit une machine à états enregistrée dans la table `deliveries` :

```
received → verifying → rejected            (dépôt invalide : rapport à Condorcet, rien n'est publié)
                     → applying → applied  (publié)
           *         → failed              (erreur de notre côté : relancé automatiquement)
```

`rejected` vient de Condorcet et attend un nouveau dépôt. `failed` vient de nous et se relance. Cette distinction structure les alertes et le rapport.

## Alternatives

| Déclenchement                                 | Pour                                                                 | Contre                                                                         | Choix      |
| --------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- |
| Cron Scalingo qui relève `incoming/`          | Rien à faire tourner en continu, relance gratuite, conteneur jetable | Jusqu'à 5 min de latence                                                       | **Retenu** |
| Processus `worker` en boucle                  | Latence faible                                                       | Un conteneur payé en permanence pour quelques dépôts par semaine               | Non        |
| Notifications d'événements S3 vers un webhook | Temps réel                                                           | Support incertain chez le fournisseur, traitement long dans le conteneur `web` | Non        |

| Validation des JSON                               | Pour                                                                      | Contre                                                           | Choix                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| Ajv sur le schéma de `notebook.json` du protocole | Le schéma convenu avec Condorcet fait foi, on s'appuie directement dessus | Types TypeScript à écrire à côté                                 | **Retenu**, à confirmer en phase 2 avec `architect` |
| Zod                                               | Types dérivés automatiquement                                             | Une deuxième version des schémas qui peut s'écarter du protocole | Non                                                 |
| Parseurs écrits à la main, comme `load.ts`        | Aucune dépendance                                                         | Gros volume de code qui reproduit les schémas                    | Non                                                 |

## Phases

1. [Exécuter un job TypeScript sur Scalingo](phase-1-job-runtime.md)
2. [Types du domaine et parseur de `notebook.json`](phase-2-protocol-parsers.md)
3. [Générateur de faux dépôts](phase-3-fake-deliveries.md)
4. [Lecture et vérification d'une archive](phase-4-archive-verification.md)
5. [Schéma de la base](phase-5-database-schema.md)
6. [Planification et application des changements](phase-6-plan-and-apply.md)
7. [Le job `ingest` de bout en bout](phase-7-ingest-job.md)
8. [Côté public : pages en images, retraits, recherche](phase-8-public-surface.md)
9. [Monitoring : rapports, alertes, tableau de bord](phase-9-monitoring.md)
10. [Mise en service avec Condorcet](phase-10-onboarding.md)
11. [Assistant Tchap : alertes, questions, retraits](phase-11-tchap-bot.md)

Les phases 2 et 3 peuvent avancer en parallèle. Pareil pour 8 et 9 une fois la 7 livrée. La partie questions de la phase 11 peut commencer tout de suite ; ses alertes et ses retraits attendent les phases 8 et 9. Tout le reste s'enchaîne.

## Vérification

- `bun run check`, `bun run lint`, `bun run test`, `bun run build` verts à chaque phase.
- Le scénario de référence est le premier échange de la section 8 du protocole, lancé contre un S3 local ou de recette : publication, remplacement, renvoi du même ZIP et du même contenu rezippé, retrait puis retour en ligne, et un refus pour chaque contrôle.
- Côté site, le skill `verify-notebooks`, avec mise à jour des fiches `features/` concernées.

## Décisions ouvertes

- **Inventaire.** Où trouver l'inventaire des Archives nationales, et dans quel format ? Tant qu'il manque, l'identifiant du cahier (nom du dossier) n'est rapproché de rien.
- **Canal d'alerte.** Tchap, proposé en phase 11. Les autres phases supposent toujours un webhook générique.
- **Accès au tableau de bord.** Authentification basique via `src/proxy.ts` pour commencer, ou ProConnect ?
- **Droits S3.** Le fournisseur sait-il limiter une clé à un préfixe ? Sinon, prévoir un bucket de dépôt séparé.
- **Conservation.** Combien de temps garder les ZIP reçus et les fichiers des versions remplacées ou retirées ?
- **Affichage.** Servir les PNG tels quels, ou en générer des versions allégées (WebP, vignettes) pour le site ?

## Consignes d'implémentation

- Le skill `how` avant de toucher un sous-système qu'on ne connaît pas (recherche, proxy, stockage).
- Le skill `architect` en phase 2 (types et parseur) et en phase 6 (empreinte et forme du plan de changements).
- Le skill `interrogate` sur les phases 4 et 6 avant merge : ce sont elles qui décident de ce qui est publié.
- `/deslop` sur chaque diff avant commit, `unslop` sur la doc et les messages du rapport.
- Une PR par phase, titre au format Conventional Commits.
