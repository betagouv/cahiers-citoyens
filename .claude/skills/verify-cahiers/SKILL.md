---
name: verify-cahiers
description: Piloter l'application web Cahiers citoyens (Next.js 16 standalone, DSFR, graphiques @gouvfr/dsfr-chart) dans un vrai navigateur pour prouver qu'un changement marche réellement. Lance le serveur, ouvre la page, contrôle le rendu des graphiques et de la carte, capture des preuves. Utiliser avant de déclarer terminé un changement qui touche une page, un composant DSFR, un graphique, les données affichées ou le build standalone.
---

# Vérifier Cahiers citoyens

Cahiers citoyens recense les témoignages déposés dans les mairies de France lors des cahiers de doléances de l'hiver 2018-2019 et les rend consultables par territoire et par revendication. Pour l'instant : une page d'accueil publique, sans authentification ni base de données. Les chiffres viennent de `src/app/_accueil/donnees-illustratives.ts` et sont fictifs.

La surface est une **application web** servie par Next.js sur `http://localhost:<port>`. **Lis d'abord [`features/README.md`](./features/README.md)**, puis la fiche de la feature concernée.

Le harnais : `.claude/skills/verify-cahiers/scripts/cahiers-verify` (abrégé `cahiers-verify` ci-dessous), plus `agent-browser` (CLI CDP, déjà installé).

## Lancer

```bash
eval "$(.claude/skills/verify-cahiers/scripts/cahiers-verify env)"
.claude/skills/verify-cahiers/scripts/cahiers-verify launch          # next dev
.claude/skills/verify-cahiers/scripts/cahiers-verify launch --prod   # build standalone + node server.js, comme Scalingo
```

**Le port n'est pas fixe.** Le checkout principal prend 3000, chaque worktree un port stable entre 3100 et 3899 dérivé de son chemin (`scripts/dev-port.sh`, partagé avec `bun dev`). `CAHIERS_PORT` force un autre port. La ligne `eval` exporte `CAHIERS_PORT`, `CAHIERS_BASE_URL` et `AGENT_BROWSER_SESSION`, pour que les appels directs à `agent-browser` visent la même session que le script.

`launch` démarre le serveur en arrière-plan, écrit son PID dans `/tmp/cahiers-verify/$CAHIERS_PORT/server.pid` et attend que `GET /api/health` réponde `{"status":"ok"}` (≈ 5 s en dev, ≈ 15 s en `--prod` avec le build). Un serveur déjà lancé par ce harnais dans le même mode est réutilisé. Un serveur de cet arbre lancé à la main est réutilisé en dev, sans écrire de PID : le cleanup ne le tuera pas. Un serveur d'un autre arbre fait refuser `launch`, car il servirait l'autre code.

Prendre `--prod` pour tout ce qui touche au build, au standalone (`public/`, `.next/static`), au rendu statique ou au déploiement : c'est le binaire que Scalingo exécute. Prendre le dev pour le reste.

Ne pas faire passer la sortie de `launch` dans un tube (`launch | tail`) : si un processus hérite du tube, la commande paraît bloquée.

Logs : `/tmp/cahiers-verify/$CAHIERS_PORT/server.log` (et `build.log` en `--prod`). Next.js y trace chaque requête en dev.

## Doctor

```bash
.claude/skills/verify-cahiers/scripts/cahiers-verify doctor
```

Lecture seule : `/api/health` répond, qui tient le port (cet arbre lancé par le harnais, cet arbre lancé à la main, ou un autre arbre), `agent-browser` présent, nom de la session navigateur. À lancer en premier dès que quelque chose paraît anormal.

## Piloter

La boucle `agent-browser` : `open` → `wait --load networkidle` → `snapshot` → agir sur les `@refs` → re-`snapshot`. Les refs deviennent obsolètes à chaque changement de page.

```bash
agent-browser open "$CAHIERS_BASE_URL/"
agent-browser wait --load networkidle
agent-browser wait 2500                 # dsfr-chart se charge après l'hydratation
agent-browser snapshot
```

Contrôler le rendu des graphiques :

```bash
.claude/skills/verify-cahiers/scripts/cahiers-verify charts
```

Pour chaque graphique Chart.js (`bar-chart`, `line-chart`, `pie-chart`), compare la largeur du canvas à celle de son conteneur : `ok: false` signale le bug de dimensionnement de dsfr-chart (voir Gotchas). Pour `map-chart`, compte les zones coloriées : 18 régions attendues.

## Preuves

Dossier : `.claude/skills/verify-cahiers/evidence/` (ignoré par git, jamais supprimé par le cleanup).

```bash
.claude/skills/verify-cahiers/scripts/cahiers-verify shot <nom> [chemin]   # défaut : /
```

`shot` ouvre la page, attend les graphiques, écrit `evidence/<date>-<nom>.txt` (arbre d'accessibilité) et `evidence/<date>-<nom>.png` (page entière). Le message `✓ Screenshot saved to <chemin>` est la preuve que la capture existe. Pour un `agent-browser screenshot` direct, passer un chemin absolu.

Standards :

- Exercer le vrai parcours utilisateur dans le navigateur, pas un rendu de composant isolé ni un `curl` du HTML : les graphiques n'existent qu'après hydratation.
- Capturer l'action **et** l'état résultant. Un graphique se prouve par `charts` (mesure) **et** par la capture (image) : l'une sans l'autre a déjà menti (voir Gotchas).
- Pour une donnée affichée, confronter la valeur lue dans le `snapshot` à sa source dans `src/app/_accueil/donnees-illustratives.ts`.
- Pour un changement de build ou de déploiement, vérifier en `--prod`, puis sur l'app déployée après le push (`curl` de la page en production pour la présence du contenu).

## Nettoyer

```bash
.claude/skills/verify-cahiers/scripts/cahiers-verify cleanup
```

Arrête **uniquement** le serveur dont ce run a écrit le PID, et ses processus enfants (jamais un `pkill node`). Ferme la session `agent-browser` de l'arbre. Les preuves survivent.

## Gotchas qui invalident un run

- **`agent-browser screenshot --full` ment sur les graphiques.** Il agrandit la fenêtre et capture pendant que Chart.js se redimensionne : l'image montre des graphiques miniatures alors que la page est juste. `shot` contourne en agrandissant la fenêtre lui-même puis en attendant 2 s. Constaté le 2026-11-06.
- **dsfr-chart construit parfois son canvas hors de la page**, au montage et, pour le camembert, à chaque redimensionnement. Chart.js retombe alors sur une taille minuscule (20×16 px). `src/app/_accueil/dsfr-chart.tsx` le détecte et force une reconstruction. `charts` est le contrôle de non-régression : tout `ok: false` est un bug réel.
- **`document.querySelector("h1")` renvoie `Paramètres d'affichage`**, le titre de la modale de thème DSFR, placé dans le DOM. Lire les titres dans le `snapshot`.
- **Un ancien serveur qui tient le port sert l'ancien code.** Si `next start` ou `node server.js` échoue en `EADDRINUSE`, l'ancien processus continue de répondre et la page paraît inchangée. `doctor` dit qui tient le port ; ne jamais conclure à un défaut sans l'avoir lu.
- **Le pastille « N » en bas de page** est l'indicateur de `next dev` : elle n'apparaît pas en `--prod` ni en production.
- **Les graphiques ne sont pas dans le HTML serveur.** Un `curl` de la page ne voit que le squelette de chargement (`role="status"`). Seul le navigateur prouve un graphique.
- **npm installe sur Scalingo, pas Bun.** Un conflit de peer dependencies toléré par Bun fait échouer le déploiement (`ERESOLVE`). `.npmrc` porte `legacy-peer-deps=true` pour cette raison. Après un ajout de dépendance, simuler `npm install --dry-run` dans un dossier temporaire avec `package.json` et `.npmrc`.

## Maintenir

Celui qui change un parcours met à jour sa fiche sous `features/` dans le même commit (règle d'`AGENTS.md`). Tout piège rencontré en vérifiant se consigne le jour même dans la fiche ou dans les gotchas ci-dessus. `/maintain-verification-skill` fait le passage périodique avec une session live.
