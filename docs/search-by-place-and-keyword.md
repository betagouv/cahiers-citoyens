# Recherche par lieu et mot-clé

Le formulaire de l'accueil (`src/app/_components/home-search-form.tsx`) a deux champs : « Lieu » (commune, code postal ou département) et « Mot-clé ». Chacun propose des suggestions pendant la frappe, avec le nombre de pages publiées. Le bouton annonce le nombre de pages qu'il va montrer : celles du lieu (« Voir les 286 pages »), puis celles du mot-clé une fois que c'est un mot entier, choisi dans la liste ou tapé exactement comme une suggestion. Un début de mot (« retr ») ne change pas le nombre ; envoyé quand même, il donne la page de résultats annoncée par le bouton : un avis « « retr » n’est pas un mot des cahiers de Charolles (71) » avec les mots qui commencent ainsi, puis les pages du lieu. `/search?place=…&q=…` liste ces pages.

## Ce que compte un nombre

Une page compte si son cahier est `published`. Le lieu filtre `notebooks` (`publishedIn`, `src/lib/page-search/published-in.ts`) :

- département : `notebooks.department_code` ;
- commune : `notebooks.insee_code` vaut le code actuel, ou un ancien code que `municipality_code_history` ramène à lui. Les cahiers portent le code INSEE de 2019.

Un mot-clé se cherche tel qu'il est écrit, sans racine : « retraite », « retraites » et « retraité » sont trois mots. `pages.words` (`to_tsvector('simple', text)`) garde chaque mot en minuscules avec ses accents, et une page correspond si elle contient chaque mot du mot-clé (`words @@ plainto_tsquery('simple', q)`). La suggestion « retraite — 7 pages », le bouton et la liste de résultats donnent donc le même nombre.

Seule la saisie d'une suggestion ignore les accents et les majuscules : « retr » propose « retraite » et « rétrocession ». `fold_accents` (SQL) et `foldAccents` (TypeScript) replient les mots de la même façon ; un test sous Postgres le vérifie (`fold-accents.postgres.test.ts`).

## Structures

| Objet                                                 | Contenu                                                                 | Sert                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------- |
| `pages.words` + `pages_words_idx` (GIN)               | mots de chaque page, tels qu'écrits                                     | compte et liste en direct                 |
| `municipalities_postal_codes_idx` (GIN)               | codes postaux                                                           | lieu saisi en 4 ou 5 chiffres             |
| `word_page_counts` (vue matérialisée)                 | `(scope, word, search_word, page_count)`, `scope` = département ou `FR` | suggestions de mots, compte d'un mot      |
| `word_page_counts_scope_search_word_idx`              | btree `(scope, search_word text_pattern_ops)`                           | `search_word LIKE 'retr%'` par lieu       |
| `word_page_counts_scope_word_idx` (unique)            | `(scope, word)`                                                         | compte d'un mot, `REFRESH … CONCURRENTLY` |
| `place_page_counts` (vue matérialisée) + index unique | pages par département et par commune actuelle                           | suggestions de lieux, bouton sans mot-clé |

Les suggestions de lieu lisent toutes les communes et tous les départements, y compris ceux sans page (« À venir ») : nom normalisé (`municipalities.search_name`, btree `text_pattern_ops`), code postal (GIN, recouvrement avec les 10 codes qui complètent 4 chiffres), code INSEE (clé primaire), département (`municipalities.department_code`). Les 101 départements sont lus en entier. D'abord le département dont le code ou le nom est la saisie, puis par nombre de pages, puis par population.

### Pourquoi des comptes précalculés

Un mot courant apparaît dans presque toutes les pages : le compter en direct dans toute la France lit chaque page (300 ms pour 40 000 pages fictives, plusieurs secondes à quelques centaines de milliers). Une suggestion part à chaque frappe : elle doit répondre en quelques millisecondes.

- France et départements : `word_page_counts`. Une suggestion est une lecture d'index sur le préfixe (≈ 2 ms pour 4 000 mots candidats), un compte d'un mot une lecture de l'index unique.
- Commune : quelques cahiers, quelques dizaines de pages. Les lire directement (`unnest(pages.words)`) prend ≈ 4 ms et évite des millions de lignes précalculées (une par commune et par mot).
- Plusieurs mots : compte en direct, par l'index GIN.

Taille mesurée sur 40 000 pages fictives au vocabulaire synthétique : 1,2 million de lignes, 67 Mo plus 93 Mo d'index. Le vocabulaire d'un vrai département croît moins vite (loi de Heaps) ; à surveiller quand les vraies pages arriveront.

## Rafraîchir les comptes

```sql
select refresh_search_counts();
```

À appeler après chaque transaction qui change les pages publiées : dépôt appliqué, cahier retiré ou republié (phase 6). `db:seed` l'appelle déjà, car la correspondance des anciens codes change les comptes par commune. `CONCURRENTLY` laisse les suggestions répondre pendant le calcul, qui reprend toutes les pages (≈ 20 s pour 40 000 pages en local). Entre l'application d'un dépôt et la fin du rafraîchissement, une suggestion peut annoncer l'ancien nombre ; la liste de résultats, elle, est toujours en direct.

## Routes

Toutes en `GET`, cacheables (`Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=3600`) : les comptes ne changent qu'après un dépôt.

- `/api/suggestions/places?q=Char` : 8 lieux au plus ;
- `/api/suggestions/words?q=retr&place=71106` : 8 mots au plus, `place` facultatif ;
- `/api/pages/count?place=71106&q=retraite` : `{ "pageCount": 7 }`.

Le navigateur attend 150 ms après la dernière frappe et abandonne la requête précédente (`AbortController`).

## Page de résultats

`/search` distingue deux recherches par la présence de `place` dans l'URL, même vide : le formulaire lieu et mot-clé l'envoie toujours, la barre de recherche de l'en-tête (question en langage courant, réponse rédigée par Albert) n'envoie que `q`. `place` accepte un code INSEE, un ou plusieurs codes de département séparés par des virgules (`areaHref`), ou le texte saisi sans JavaScript, interprété par la première suggestion. 20 pages par page de résultats, dans l'ordre des cahiers ; extrait surligné par `ts_headline('simple', …)`.

Une page de lieu (`/search?place=25`) est indexable ; une recherche par mot-clé est en `noindex, follow`.
