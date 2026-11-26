---
name: verify-notebooks
description: Piloter l'application web Cahiers citoyens (Next.js 16 standalone, DSFR, Postgres, recherche via Albert) dans un vrai navigateur pour prouver qu'un changement marche réellement. Lance le serveur, ouvre la page, contrôle les données affichées et les statuts HTTP, capture des preuves. Utiliser avant de déclarer terminé un changement qui touche une page, un composant DSFR, les données affichées, la recherche ou le build standalone.
---

# Vérifier Cahiers citoyens

Cahiers citoyens rend consultables les cahiers de doléances ouverts dans les mairies pendant l'hiver 2018-2019 : un accueil avec une recherche par lieu et mot-clé, la liste des cahiers, la page d'un cahier (chaque page en image à côté de sa transcription) et une recherche en langage courant qui rédige une réponse sourcée. Pas d'authentification. Les pages lisent une base Postgres (`DATABASE_URL`), les images un bucket S3 privé (ou `LOCAL_BUCKET_DIR` en local), la recherche l'API Albert. Les cahiers chargés aujourd'hui sont fictifs : des faux dépôts (`scripts/fake-data/deliver.ts`) publiés par `scripts/ingest-local.ts`.

La surface est une **application web** servie par Next.js sur `http://localhost:<port>`. **Lis d'abord [`features/README.md`](./features/README.md)**, puis la fiche de la feature concernée.

Le harnais : `.claude/skills/verify-notebooks/scripts/notebooks-verify` (abrégé `notebooks-verify` ci-dessous), plus `agent-browser` (CLI CDP, déjà installé).

## Lancer

```bash
eval "$(.claude/skills/verify-notebooks/scripts/notebooks-verify env)"
.claude/skills/verify-notebooks/scripts/notebooks-verify launch          # next dev
.claude/skills/verify-notebooks/scripts/notebooks-verify launch --prod   # build standalone + node server.js, comme Scalingo
```

**Le port n'est pas fixe.** Le checkout principal prend 3000, chaque worktree un port stable entre 3100 et 3899 dérivé de son chemin (`scripts/dev-port.sh`, partagé avec `bun dev`). `NOTEBOOKS_PORT` force un autre port. La ligne `eval` exporte `NOTEBOOKS_PORT`, `NOTEBOOKS_BASE_URL` et `AGENT_BROWSER_SESSION`, pour que les appels directs à `agent-browser` visent la même session que le script.

`launch` démarre le serveur en arrière-plan, écrit son PID dans `/tmp/notebooks-verify/$NOTEBOOKS_PORT/server.pid` et attend que `GET /api/health` réponde `{"status":"ok"}` (≈ 5 s en dev, ≈ 15 s en `--prod` avec le build). Un serveur déjà lancé par ce harnais dans le même mode est réutilisé. Un serveur de cet arbre lancé à la main est réutilisé en dev, sans écrire de PID : le cleanup ne le tuera pas. Un serveur d'un autre arbre fait refuser `launch`, car il servirait l'autre code.

Prendre `--prod` pour tout ce qui touche au build, au standalone (`public/`, `.next/static`), au rendu statique ou au déploiement : c'est le binaire que Scalingo exécute. Prendre le dev pour le reste.

Ne pas faire passer la sortie de `launch` dans un tube (`launch | tail`) : si un processus hérite du tube, la commande paraît bloquée.

Logs : `/tmp/notebooks-verify/$NOTEBOOKS_PORT/server.log` (et `build.log` en `--prod`). Next.js y trace chaque requête en dev.

## Doctor

```bash
.claude/skills/verify-notebooks/scripts/notebooks-verify doctor
```

Lecture seule : `/api/health` répond, qui tient le port (cet arbre lancé par le harnais, cet arbre lancé à la main, ou un autre arbre), `agent-browser` présent, nom de la session navigateur. À lancer en premier dès que quelque chose paraît anormal.

## Piloter

La boucle `agent-browser` : `open` → `wait --load networkidle` → `snapshot` → agir sur les `@refs` → re-`snapshot`. Les refs deviennent obsolètes à chaque changement de page.

```bash
agent-browser open "$NOTEBOOKS_BASE_URL/"
agent-browser wait --load networkidle
agent-browser wait 2500                 # le contenu sous Suspense arrive en flux
agent-browser snapshot
```

Un statut HTTP se contrôle avec `curl -s -o /dev/null -w "%{http_code}\n" "$NOTEBOOKS_BASE_URL<chemin>"`, en `--prod` : le dev ne précalcule pas l'enveloppe statique et peut répondre un statut que la production ne donne pas (voir la fiche `notebooks.md`).

## Preuves

Dossier : `.claude/skills/verify-notebooks/evidence/` (ignoré par git, jamais supprimé par le cleanup).

```bash
.claude/skills/verify-notebooks/scripts/notebooks-verify shot <nom> [chemin]   # défaut : /
```

`shot` ouvre la page, attend le contenu diffusé en flux, écrit `evidence/<date>-<nom>.txt` (arbre d'accessibilité) et `evidence/<date>-<nom>.png` (page entière). Largeur 1280 px par défaut ; `NOTEBOOKS_SHOT_WIDTH=375 notebooks-verify shot <nom>` capture la version mobile. Le message `✓ Screenshot saved to <chemin>` est la preuve que la capture existe. Pour un `agent-browser screenshot` direct, passer un chemin absolu.

Standards :

- Exercer le vrai parcours utilisateur dans le navigateur, pas un rendu de composant isolé ni un `curl` du HTML : le contenu sous Suspense arrive en flux après l'enveloppe.
- Capturer l'action **et** l'état résultant.
- Pour une donnée affichée, confronter la valeur lue dans le `snapshot` à sa source en base (`psql`, requête donnée dans la fiche).
- Pour un changement de build ou de déploiement, vérifier en `--prod`, puis sur l'app déployée après le push (`curl` de la page en production pour la présence du contenu).

## Nettoyer

```bash
.claude/skills/verify-notebooks/scripts/notebooks-verify cleanup
```

Arrête **uniquement** le serveur dont ce run a écrit le PID, et ses processus enfants (jamais un `pkill node`). Ferme la session `agent-browser` de l'arbre. Les preuves survivent.

## Gotchas qui invalident un run

- **`agent-browser screenshot --full` capture avant que la page ne se réajuste** à la nouvelle taille de fenêtre. `shot` contourne en agrandissant la fenêtre lui-même puis en attendant 2 s. Constaté le 2026-11-06.
- **`document.querySelector("h1")` renvoie `Paramètres d'affichage`**, le titre de la modale de thème DSFR, placé dans le DOM. Lire les titres dans le `snapshot`.
- **Un ancien serveur qui tient le port sert l'ancien code.** Si `next start` ou `node server.js` échoue en `EADDRINUSE`, l'ancien processus continue de répondre et la page paraît inchangée. `doctor` dit qui tient le port ; ne jamais conclure à un défaut sans l'avoir lu.
- **Le pastille « N » en bas de page** est l'indicateur de `next dev` : elle n'apparaît pas en `--prod` ni en production.
- **Un 404 en dev ne prouve rien pour la production.** Avec Cache Components, le standalone envoie l'enveloppe statique précalculée avant le rendu de la page : un `notFound()` dans la page y répondait 200. Contrôler les statuts en `--prod`. Constaté le 2026-11-11.
- **Le standalone ne lit pas `.env.local`.** `launch --prod` hérite de l'environnement du shell : exporter les variables avant (`set -a; . ./.env.local; set +a`).
- **npm installe sur Scalingo, pas Bun.** Un conflit de peer dependencies toléré par Bun fait échouer le déploiement (`ERESOLVE`). Après un ajout de dépendance, simuler `npm install --dry-run --ignore-scripts` dans un dossier temporaire qui ne contient que `package.json`.

## Maintenir

Celui qui change un parcours met à jour sa fiche sous `features/` dans le même commit (règle d'`AGENTS.md`). Tout piège rencontré en vérifiant se consigne le jour même dans la fiche ou dans les gotchas ci-dessus. `/maintain-verification-skill` fait le passage périodique avec une session live.
