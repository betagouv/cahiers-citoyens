-- Nom et département au 1er janvier 2019 des communes fusionnées depuis
-- (docs/search-by-place-and-keyword.md). Les lignes déjà chargées reçoivent
-- un nom vide, sans défaut ensuite : `db:seed --if-empty` les détecte et
-- recharge le référentiel au déploiement suivant.
ALTER TABLE "municipality_code_history" ADD COLUMN "name" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "municipality_code_history" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "municipality_code_history" ADD COLUMN "department_code" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "municipality_code_history" ALTER COLUMN "department_code" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "municipality_code_history" ADD COLUMN "search_name" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "municipality_code_history" ALTER COLUMN "search_name" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "municipality_code_history_search_name_idx" ON "municipality_code_history" USING btree ("search_name" text_pattern_ops);--> statement-breakpoint
-- `place_page_counts` compte aussi chaque ancien code seul : choisir
-- « Béon (ancienne commune) » montre les pages des cahiers de Béon, celles que
-- `publishedIn` retient pour ce code. Un ancien code n'est jamais un code
-- actuel : les deux branches ne se recouvrent pas.
DROP MATERIALIZED VIEW place_page_counts;--> statement-breakpoint
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
GROUP BY 1
UNION ALL
SELECT n.insee_code AS place, count(*)::integer AS page_count
FROM pages p
JOIN notebooks n ON n.id = p.notebook_id
JOIN municipality_code_history h ON h.old_code = n.insee_code
WHERE n.status = 'published'
GROUP BY n.insee_code;--> statement-breakpoint
CREATE UNIQUE INDEX place_page_counts_place_idx ON place_page_counts (place);
