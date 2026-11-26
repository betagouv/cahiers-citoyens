-- Comptes précalculés pour les suggestions de la recherche par lieu et
-- mot-clé (docs/search-by-place-and-keyword.md). Ni extension ni changement
-- des tables : deux vues matérialisées et deux fonctions.

-- Minuscules sans accents ni ligatures, comme `foldAccents`
-- (src/lib/page-search/fold-accents.ts), qui reprend la même table de lettres.
-- Les majuscules accentuées sont listées aussi : `lower` ne les convertit pas
-- sous une locale C.
CREATE FUNCTION fold_accents(value text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  AS $$
    SELECT replace(replace(translate(lower(value),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuyy'),
      'œ', 'oe'), 'æ', 'ae')
  $$;
--> statement-breakpoint
-- Pages publiées qui contiennent chaque mot de `pages.words`, par département
-- et pour toute la France ('FR'). Une page n'est comptée qu'une fois par mot.
CREATE MATERIALIZED VIEW word_page_counts AS
SELECT
  CASE WHEN grouping(n.department_code) = 1 THEN 'FR' ELSE n.department_code END AS scope,
  w.lexeme AS word,
  fold_accents(w.lexeme) AS search_word,
  count(*)::integer AS page_count
FROM pages p
JOIN notebooks n ON n.id = p.notebook_id
CROSS JOIN LATERAL unnest(p.words) AS w
WHERE n.status = 'published'
GROUP BY GROUPING SETS ((n.department_code, w.lexeme), (w.lexeme))
HAVING grouping(n.department_code) = 1 OR n.department_code IS NOT NULL;
--> statement-breakpoint
-- Exigé par REFRESH … CONCURRENTLY ; sert aussi le compte d'un mot exact.
CREATE UNIQUE INDEX word_page_counts_scope_word_idx ON word_page_counts (scope, word);
--> statement-breakpoint
-- Suggestions : `scope = '71' AND search_word LIKE 'retr%'`.
CREATE INDEX word_page_counts_scope_search_word_idx ON word_page_counts (scope, search_word text_pattern_ops);
--> statement-breakpoint
-- Pages publiées par département et par commune actuelle. Les codes de
-- département (2 ou 3 caractères) et INSEE (5) ne se recouvrent pas.
CREATE MATERIALIZED VIEW place_page_counts AS
SELECT n.department_code AS place, count(*)::integer AS page_count
FROM pages p
JOIN notebooks n ON n.id = p.notebook_id
WHERE n.status = 'published' AND n.department_code IS NOT NULL
GROUP BY n.department_code
UNION ALL
SELECT coalesce(h.current_code, n.insee_code) AS place, count(*)::integer AS page_count
FROM pages p
JOIN notebooks n ON n.id = p.notebook_id
LEFT JOIN municipality_code_history h ON h.old_code = n.insee_code
WHERE n.status = 'published' AND n.insee_code IS NOT NULL
GROUP BY 1;
--> statement-breakpoint
CREATE UNIQUE INDEX place_page_counts_place_idx ON place_page_counts (place);
--> statement-breakpoint
-- À appeler après chaque transaction qui change les pages publiées : dépôt
-- appliqué, cahier retiré ou republié (phase 6), et après `geo:load`, qui peut
-- changer la correspondance des anciens codes INSEE. CONCURRENTLY laisse les
-- suggestions répondre pendant le calcul.
CREATE FUNCTION refresh_search_counts() RETURNS void
  LANGUAGE plpgsql
  AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY word_page_counts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY place_page_counts;
END
$$;
