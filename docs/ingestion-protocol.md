# Protocole de dépôt des cahiers

Format des dépôts que Condorcet transmet à la plateforme. Condorcet produit pour chaque cahier les images des pages, déjà occultées, et leur transcription. La plateforme vérifie le dépôt puis met à jour les cahiers consultables.

Les noms de fichiers et de champs sont en anglais. Le contenu des transcriptions reste dans sa langue d'origine.

## 1. Transmission

Condorcet dépose un seul fichier ZIP dans le dossier `incoming/` du stockage S3, avec une clé qui ne permet que cette écriture :

```bash
aws s3 cp delivery-2026-11-24-0930.zip s3://<bucket>/incoming/
```

Le nom du fichier est `delivery-AAAA-MM-JJ-HHMM.zip`, en heure UTC (ici le 24 novembre 2026 à 09:30 UTC). Deux dépôts ne partagent jamais le même nom : un second envoi dans la même minute remplacerait le premier s'il n'a pas encore été traité.

Un objet S3 n'apparaît qu'une fois son envoi terminé. Tout ZIP présent dans `incoming/` est donc complet.

## 2. Contenu du ZIP

```
delivery-2026-11-24-0930.zip
└── notebooks/
    └── CC_01500_190318_01004_MD_16116/
        ├── notebook.json
        ├── 0001.png
        ├── 0002.png
        └── 0003.png
```

- Un dossier par cahier, sous `notebooks/`. Le nom du dossier est l'identifiant du cahier : le nom du fichier source de l'inventaire, sans extension. Il ne change jamais pour un même cahier.
- Chaque dossier contient un `notebook.json` et une image PNG par page.
- Un dossier ne contient aucun autre fichier, ni sous-dossier.
- Les noms ne contiennent ni `..`, ni barre oblique inverse, ni lien symbolique.
- Les PNG sont stockés sans recompression (ils sont déjà compressés). `notebook.json` est compressé (Deflate).
- Le ZIP utilise ZIP64 dès qu'il dépasse 4 Go.

Un dépôt peut contenir un seul cahier ou plusieurs centaines. Il ne contient que les cahiers nouveaux ou modifiés, mais renvoyer un cahier inchangé ne pose aucun problème.

## 3. `notebook.json`

```json
{
  "format": 1,
  "source_filename": "CC_01500_190318_01004_MD_16116.pdf",
  "pipeline_release": "condorcet-2026.10",
  "pages": [
    {
      "page": 1,
      "image": "0001.png",
      "text": "Délibération de l'assemblée…"
    },
    { "page": 2, "image": "0002.png", "text": "" },
    { "page": 3, "image": "0003.png", "text": "Suite du texte…" }
  ]
}
```

| Champ              | Type   | Signification                                                         |
| ------------------ | ------ | --------------------------------------------------------------------- |
| `format`           | entier | Version du format, fixée à `1`                                        |
| `source_filename`  | texte  | Nom du fichier source dans l'inventaire                               |
| `pipeline_release` | texte  | Version opaque du traitement Condorcet                                |
| `pages`            | liste  | Pages du cahier, dans l'ordre, couverture et pages blanches comprises |

Chaque élément de `pages` :

| Champ   | Type   | Signification                                                                      |
| ------- | ------ | ---------------------------------------------------------------------------------- |
| `page`  | entier | Numéro de la page, de 1 à n, sans trou                                             |
| `image` | texte  | Nom du PNG de la page, dans le même dossier                                        |
| `text`  | texte  | Transcription de la page, occultée comme l'image. Vide si la page n'a pas de texte |

Tous les champs sont obligatoires. Le fichier est en UTF-8.

### Schéma JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "notebook.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["format", "source_filename", "pipeline_release", "pages"],
  "properties": {
    "format": { "const": 1 },
    "source_filename": { "type": "string", "minLength": 1 },
    "pipeline_release": { "type": "string", "minLength": 1 },
    "pages": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["page", "image", "text"],
        "properties": {
          "page": { "type": "integer", "minimum": 1 },
          "image": { "type": "string", "pattern": "^[A-Za-z0-9._-]+\\.png$" },
          "text": { "type": "string" }
        }
      }
    }
  }
}
```

## 4. Vérifications

La plateforme vérifie, pour chaque cahier :

- `notebook.json` est présent et respecte le schéma ;
- les pages sont numérotées de 1 à n, dans l'ordre, sans trou ni doublon ;
- chaque image annoncée existe, n'est citée qu'une fois et est un PNG lisible ;
- le dossier ne contient aucun fichier non annoncé ;
- chaque fichier s'extrait sans erreur (le ZIP contrôle chaque fichier par CRC32).

**Tout ou rien.** Une seule erreur refuse le dépôt entier. Le rapport liste toutes les erreurs trouvées, pas seulement la première. Condorcet corrige et renvoie : les cahiers inchangés ne sont pas retraités.

## 5. Publication

La plateforme calcule elle-même une empreinte de chaque cahier : SHA-256 des images, des textes et de l'ordre des pages. `format`, `pipeline_release` et toute date en sont exclus.

| Cahier dans le ZIP                     | Résultat                     |
| -------------------------------------- | ---------------------------- |
| Inconnu                                | Publié                       |
| Même empreinte que la version en ligne | Rien                         |
| Empreinte différente                   | Remplace la version en ligne |
| Absent du ZIP                          | Rien, il reste en ligne      |

Un ZIP reconstruit avec les mêmes fichiers ne change donc rien, même si ses dates diffèrent.

Une version remplacée n'est plus consultable. La plateforme numérote elle-même les versions successives de chaque cahier et en garde l'historique interne (date, empreinte, `pipeline_release`).

Les fichiers d'un cahier sont publiés en une seule opération : le site n'affiche jamais un mélange de deux versions.

## 6. Retrait

Le ZIP ne sert pas à retirer un cahier. Sur demande de Condorcet, l'équipe de la plateforme retire le cahier du site, de la recherche et des fichiers servis, avec un motif : `not_publishable`, `sensitive_content`, `source_correction` ou `other`. La plateforme garde une trace interne du retrait.

Un cahier retiré revient en ligne s'il figure de nouveau dans un dépôt.

## 7. Rapport

Après traitement, la plateforme écrit `reports/delivery-2026-11-24-0930.json`, lisible par Condorcet :

```json
{
  "delivery": "delivery-2026-11-24-0930.zip",
  "received_at": "2026-11-24T09:31:12Z",
  "status": "applied",
  "notebooks": { "published": 12, "replaced": 3, "unchanged": 85 },
  "errors": []
}
```

`status` vaut `applied` ou `rejected`. En cas de refus, chaque erreur indique le cahier, le fichier, la page si besoin, un code et un message.

## 8. Premier échange

Essai avec un seul cahier, puis vérification ensemble :

- dépôt du ZIP et lecture du rapport ;
- affichage de chaque page avec sa transcription ;
- refus d'un dépôt défectueux (page manquante, image absente, fichier en trop) ;
- renvoi du même ZIP, puis du même contenu rezippé : aucun changement ;
- remplacement par un contenu modifié ;
- retrait sur demande, puis retour en ligne par un nouveau dépôt.

Points à confirmer avant l'essai :

- les PNG livrés sont déjà occultés ;
- le nom du fichier source est stable et unique pour chaque cahier ;
- taille moyenne d'un cahier et rythme prévu des dépôts.
