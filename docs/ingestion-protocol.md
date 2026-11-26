# Protocole de dépôt des cahiers

Format des dépôts que Condorcet transmet à la plateforme. Condorcet produit pour chaque cahier les images des pages, déjà occultées, et leur transcription. La plateforme vérifie le dépôt puis met à jour les cahiers consultables.

Le format des fichiers est celui que Condorcet produit déjà : noms de champs en français, un JSON par cahier, une image par page. La plateforme le convertit à la lecture dans son propre modèle.

## 1. Transmission

Condorcet dépose un seul fichier ZIP dans le dossier `incoming/` du stockage S3, avec une clé qui ne permet que cette écriture :

```bash
aws s3 cp delivery-2026-11-24-0930.zip s3://<bucket>/incoming/
```

Le nom du fichier est `delivery-AAAA-MM-JJ-HHMM.zip`, en heure UTC (ici le 24 novembre 2026 à 09:30 UTC). Deux dépôts ne partagent jamais le même nom : un second envoi dans la même minute remplacerait le premier s'il n'a pas encore été traité.

Un objet S3 n'apparaît qu'une fois son envoi terminé. Tout ZIP présent dans `incoming/` est donc complet.

Une fois l'envoi terminé, Condorcet prévient la plateforme par un appel `POST /api/deliveries/notify`, avec le jeton que l'équipe lui a transmis (valeurs fictives) :

```bash
curl -X POST https://cahiers.example.org/api/deliveries/notify \
  -H "Authorization: Bearer jeton-fictif-0123456789"
```

La plateforme répond `202 {"status":"accepted"}` tout de suite, puis traite le dépôt. Le corps de la requête est ignoré. Appeler deux fois ne pose aucun problème : un second appel dans les 30 s ne lance rien de plus. Un jeton absent ou faux reçoit `401`.

Sans cet appel, ou s'il échoue, le dépôt est quand même traité dans l'heure : la plateforme relève `incoming/` toutes les heures.

## 2. Contenu du ZIP

```
delivery-2026-11-24-0930.zip
├── CC_01500_190318_01004_MD_16116.json
├── CC_01500_190318_01004_MD_16116_1.png
├── CC_01500_190318_01004_MD_16116_3.png
├── CC_02100_190211_02999_MD_20001.json
├── CC_02100_190211_02999_MD_20001_1.png
└── …
```

- Tous les fichiers sont à la racine du ZIP, sans dossier.
- Chaque cahier a un fichier `<id_cahier>.json` et une image par page, nommée `<id_page>.<extension>`, soit `<id_cahier>_<numero_page>.png` : `CC_01500_190318_01004_MD_16116_3.png` est la page 3 de ce cahier.
- L'identifiant du cahier ne change jamais pour un même cahier. Il ne contient que des lettres sans accent, des chiffres, `.`, `_` et `-`.
- Le ZIP ne contient aucun autre fichier. Les noms ne contiennent ni `..`, ni barre oblique, ni barre oblique inverse, et aucun fichier n'est un lien symbolique.
- Les images sont des JPEG ou des PNG. La plateforme reconnaît le type à ses premiers octets, pas à l'extension : un JPEG nommé `.png` est accepté. Les extensions admises sont `.png`, `.jpg` et `.jpeg`.
- Les images sont stockées sans recompression (elles sont déjà compressées). Les JSON sont compressés (Deflate).
- Le ZIP utilise ZIP64 dès qu'il dépasse 4 Go.

Un dépôt peut contenir un seul cahier ou plusieurs centaines. Il ne contient que les cahiers nouveaux ou modifiés, mais renvoyer un cahier inchangé ne pose aucun problème.

## 3. JSON d'un cahier

Exemple (données fictives) :

```json
{
  "schema_version": "Campus Condorcet",
  "id_cahier": "CC_01500_190318_01004_MD_16116",
  "metadonnees": {
    "departement": "Ain",
    "numero_departement": "01",
    "commune": "Exempleville",
    "code_insee": "01004",
    "code_postal": "01500",
    "type_transcription_dactylographiee": "automatique",
    "type_transcription_manuscrite": "manuelle"
  },
  "pages": [
    {
      "numero_page": 1,
      "id_page": "CC_01500_190318_01004_MD_16116_1",
      "largeur": 2484,
      "hauteur": 3507,
      "lignes": [
        {
          "id_ligne": "CC_01500_190318_01004_MD_16116_1_1",
          "type_ligne": "dactylographiee",
          "type_zone": "non renseigné",
          "transcription": "Cahier de doléances",
          "polygone": {
            "type": "Polygon",
            "coordinates": [
              [
                [239, 282],
                [904, 282],
                [904, 353],
                [239, 353],
                [239, 282]
              ]
            ]
          }
        }
      ]
    },
    {
      "numero_page": 3,
      "id_page": "CC_01500_190318_01004_MD_16116_3",
      "largeur": 2484,
      "hauteur": 3507,
      "lignes": []
    }
  ]
}
```

| Champ            | Type  | Signification                                                     |
| ---------------- | ----- | ----------------------------------------------------------------- |
| `schema_version` | texte | Version du format chez Condorcet, gardée telle quelle             |
| `id_cahier`      | texte | Identifiant du cahier, identique au nom du fichier JSON           |
| `metadonnees`    | objet | Département, commune et modes de transcription                    |
| `pages`          | liste | Pages du cahier, par numéro croissant, pages sans texte comprises |

`metadonnees` :

| Champ                                | Type  | Signification                                        |
| ------------------------------------ | ----- | ---------------------------------------------------- |
| `departement`                        | texte | Nom du département                                   |
| `numero_departement`                 | texte | Deux chiffres, `2A`, `2B`, ou `97x` outre-mer        |
| `commune`                            | texte | Nom de la commune                                    |
| `code_insee`                         | texte | Code INSEE de la commune, 5 caractères               |
| `code_postal`                        | texte | Code postal, 5 chiffres                              |
| `type_transcription_dactylographiee` | texte | `automatique` ou `manuelle`, pour le texte tapé      |
| `type_transcription_manuscrite`      | texte | `automatique` ou `manuelle`, pour le texte manuscrit |

Chaque élément de `pages` :

| Champ         | Type   | Signification                                                                 |
| ------------- | ------ | ----------------------------------------------------------------------------- |
| `numero_page` | entier | Numéro de la page, à partir de 1                                              |
| `id_page`     | texte  | `<id_cahier>_<numero_page>`, nom de l'image sans extension                    |
| `largeur`     | entier | Largeur de l'image en pixels                                                  |
| `hauteur`     | entier | Hauteur de l'image en pixels                                                  |
| `lignes`      | liste  | Lignes transcrites, dans l'ordre de lecture. Vide si la page n'a pas de texte |

Chaque élément de `lignes` :

| Champ           | Type    | Signification                                                                     |
| --------------- | ------- | --------------------------------------------------------------------------------- |
| `id_ligne`      | texte   | Commence par `<id_page>_`                                                         |
| `type_ligne`    | texte   | `manuscrite` ou `dactylographiee`                                                 |
| `type_zone`     | texte   | Zone de la page, libre (`Corps de la contribution`…). `non renseigné` si inconnue |
| `transcription` | texte   | Texte de la ligne, occulté comme l'image                                          |
| `polygone`      | GeoJSON | Contour de la ligne sur l'image, en pixels depuis le coin haut gauche             |

Tous les champs sont obligatoires, aucun autre n'est admis. Le fichier est en UTF-8.

### Schéma JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Cahier Condorcet",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "id_cahier", "metadonnees", "pages"],
  "properties": {
    "schema_version": { "type": "string", "minLength": 1 },
    "id_cahier": { "type": "string", "minLength": 1 },
    "metadonnees": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "departement",
        "numero_departement",
        "commune",
        "code_insee",
        "code_postal",
        "type_transcription_dactylographiee",
        "type_transcription_manuscrite"
      ],
      "properties": {
        "departement": { "type": "string", "minLength": 1 },
        "numero_departement": {
          "type": "string",
          "pattern": "^([0-9]{2}|2[AB]|97[0-9])$"
        },
        "commune": { "type": "string", "minLength": 1 },
        "code_insee": {
          "type": "string",
          "pattern": "^([0-9]{2}|2[AB])[0-9]{3}$"
        },
        "code_postal": { "type": "string", "pattern": "^[0-9]{5}$" },
        "type_transcription_dactylographiee": {
          "enum": ["automatique", "manuelle"]
        },
        "type_transcription_manuscrite": { "enum": ["automatique", "manuelle"] }
      }
    },
    "pages": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["numero_page", "id_page", "largeur", "hauteur", "lignes"],
        "properties": {
          "numero_page": { "type": "integer", "minimum": 1 },
          "id_page": { "type": "string", "minLength": 1 },
          "largeur": { "type": "integer", "minimum": 1 },
          "hauteur": { "type": "integer", "minimum": 1 },
          "lignes": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "id_ligne",
                "type_ligne",
                "type_zone",
                "transcription",
                "polygone"
              ],
              "properties": {
                "id_ligne": { "type": "string", "minLength": 1 },
                "type_ligne": { "enum": ["manuscrite", "dactylographiee"] },
                "type_zone": { "type": "string" },
                "transcription": { "type": "string" },
                "polygone": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": ["type", "coordinates"],
                  "properties": {
                    "type": { "const": "Polygon" },
                    "coordinates": {
                      "type": "array",
                      "minItems": 1,
                      "items": {
                        "type": "array",
                        "minItems": 4,
                        "items": {
                          "type": "array",
                          "minItems": 2,
                          "maxItems": 2,
                          "items": { "type": "number", "minimum": 0 }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## 4. Vérifications

La plateforme vérifie, pour chaque cahier :

- le JSON est valide et respecte le schéma ;
- `id_cahier` est le nom du fichier JSON, sans `.json` ;
- les numéros de page croissent strictement : ni doublon, ni retour en arrière. Les trous sont admis (pages 1, 5, 7) ;
- chaque `id_page` vaut `<id_cahier>_<numero_page>`, et chaque `id_ligne` commence par `<id_page>_` ;
- chaque page a son image, et une seule ; c'est un JPEG ou un PNG lisible ;
- chaque image a la largeur et la hauteur annoncées par `largeur` et `hauteur` ;
- chaque polygone tient dans l'image : `0 ≤ x ≤ largeur`, `0 ≤ y ≤ hauteur` ;
- aucun fichier n'est en trop : chaque image appartient à une page annoncée ;
- chaque fichier s'extrait sans erreur (le ZIP contrôle chaque fichier par CRC32) ; un JSON pèse 20 Mo au plus.

Pour le dépôt : le nom suit `delivery-AAAA-MM-JJ-HHMM.zip`, et les règles de la section 2 sur les noms (racine, ni `..`, ni barre oblique inverse, ni lien symbolique, aucun nom en double).

Les fichiers sont rattachés à un cahier par leur nom : `X.json` décrit le cahier `X`, et l'image `X_3.png` est la page 3 du cahier `X`.

**Tout ou rien.** Une seule erreur refuse le dépôt entier. Le rapport liste toutes les erreurs trouvées, pas seulement la première. Condorcet corrige et renvoie : les cahiers inchangés ne sont pas retraités.

## 5. Publication

La plateforme calcule elle-même une empreinte de chaque cahier : SHA-256 des métadonnées, des numéros et dimensions des pages, de chaque image et des lignes (texte, type, zone, polygone), dans l'ordre. `schema_version`, les identifiants de page et de ligne, les noms de fichiers et toute date en sont exclus. Une correction de la commune suffit donc à republier le cahier.

| Cahier dans le ZIP                     | Résultat                     |
| -------------------------------------- | ---------------------------- |
| Inconnu                                | Publié                       |
| Même empreinte que la version en ligne | Rien                         |
| Empreinte différente                   | Remplace la version en ligne |
| Absent du ZIP                          | Rien, il reste en ligne      |

Un ZIP reconstruit avec les mêmes fichiers ne change donc rien, même si ses dates diffèrent.

Une version remplacée n'est plus consultable. La plateforme numérote elle-même les versions successives de chaque cahier et en garde l'historique interne (date, empreinte, `schema_version`).

Les fichiers d'un cahier sont publiés en une seule opération : le site n'affiche jamais un mélange de deux versions.

## 6. Retrait

Le ZIP ne sert pas à retirer un cahier. Sur demande de Condorcet, l'équipe de la plateforme retire le cahier du site, de la recherche et des fichiers servis, avec un motif : `not_publishable`, `sensitive_content`, `source_correction` ou `other`. La plateforme garde une trace interne du retrait.

Un cahier retiré revient en ligne s'il figure de nouveau dans un dépôt.

## 7. Rapport

Après traitement, la plateforme écrit `reports/delivery-2026-11-24-0930.json`, sous le même préfixe que `incoming/`, lisible par Condorcet :

```json
{
  "schema_version": 1,
  "delivery": "delivery-2026-11-24-0930.zip",
  "received_at": "2026-11-24T09:31:12.000Z",
  "finished_at": "2026-11-24T09:33:40.000Z",
  "status": "applied",
  "notebooks": { "published": 12, "replaced": 3, "unchanged": 85 },
  "errors": []
}
```

- `schema_version` est la version du format du rapport, distincte de celle des cahiers. Elle change si un champ change de sens ou disparaît ; un champ ajouté ne la change pas.
- `status` vaut `applied` (publié), `rejected` (refusé, rien n'est publié) ou `failed` (échec de notre côté, voir plus bas).
- `notebooks` compte les cahiers publiés (nouveaux, ou retirés puis remis en ligne), remplacés et inchangés. Ils valent 0 pour un dépôt refusé. Un dépôt ne retire jamais de cahier (section 6) : il n'y a pas de compteur de retraits.
- En cas de refus, chaque erreur de `errors` indique le cahier (`notebook`), le fichier (`file`), un `code` et un `message`, et si besoin la page : `page` est son numéro, `position` son rang dans la liste `pages` du JSON (une erreur du JSON l'indique, car le numéro peut y être invalide).

Le rapport est écrit par le passage du job qui termine le dépôt : quelques minutes après l'appel de la section 1, ou au passage horaire. Si l'écriture échoue, le passage suivant la refait, avec le même contenu.

**Échec de notre côté.** Si le traitement échoue chez nous (base ou stockage indisponible), la plateforme réessaie aux passages suivants. Après 3 tentatives, elle écrit un rapport `failed` avec l'erreur `processing-failed` et prévient son équipe. Condorcet n'a rien à renvoyer.

**Renvoi d'un nom déjà traité.** Un ZIP qui porte le nom d'un dépôt déjà publié ou refusé est supprimé de `incoming/` sans être lu. Le refus est écrit dans `reports/delivery-2026-11-24-0930.duplicate.json`, avec `status: "rejected"` et l'erreur `duplicate-delivery-name` ; le rapport du dépôt d'origine reste intact. Un autre renvoi du même nom remplace ce fichier. Un nouveau dépôt prend un nouvel horodatage.

## 8. Premier échange

Essai avec un seul cahier, puis vérification ensemble :

- dépôt du ZIP et lecture du rapport ;
- affichage de chaque page avec sa transcription ;
- refus d'un dépôt défectueux (image absente, page en double, fichier en trop) ;
- renvoi du même ZIP, puis du même contenu rezippé : aucun changement ;
- remplacement par un contenu modifié ;
- retrait sur demande, puis retour en ligne par un nouveau dépôt.

Points à confirmer avant l'essai :

- les images livrées sont déjà occultées ;
- `id_cahier` est stable et unique pour chaque cahier ;
- les trous de numérotation (pages 1, 5, 7 par exemple) sont-ils normaux ? Pages écartées, ou pages manquantes ?
- nommer les JPEG `.jpg` plutôt que `.png` : la plateforme accepte les deux, mais l'extension ne correspond pas au contenu ;
- signification de `schema_version` (aujourd'hui `Campus Condorcet`) : changera-t-il quand le format évoluera ?
- taille moyenne d'un cahier et rythme prévu des dépôts.
