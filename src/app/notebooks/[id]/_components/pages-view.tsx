import { useDebouncedJson } from "@/app/_components/place-keyword/use-debounced-json";
import { keywordLinesSrc } from "@/lib/notebook-links";
import type { PageContent } from "@/lib/notebooks";
import { keywordWords, splitKeyword } from "@/lib/page-search/keyword-match";
import { parseKeywordLines } from "@/lib/page-search/responses";
import { FIRST_OCCURRENCE_ID, KeywordSummary } from "./keyword-summary";
import { NotebookPageItem } from "./notebook-page-item";
import { PageIndex } from "./page-index";

const NO_LINES: readonly string[] = [];

export interface PagesViewProps {
  notebookId: string;
  version: number;
  pages: PageContent[];
}

// Les pages du cahier, le mot-clé `keyword` surligné partout où il apparaît.
// Sans mot-clé, les pages s'affichent telles quelles. Les contours des lignes
// trouvées se lisent après coup : le calque se pose sur l'image sans rien
// décaler.
export function PagesView({
  notebookId,
  version,
  pages,
  keyword,
}: PagesViewProps & { keyword: string }) {
  const words = keywordWords(keyword);
  const segmentsByPage = pages.map((page) => splitKeyword(page.text, words));
  const counts = segmentsByPage.map(
    (segments) => segments.filter((segment) => segment.highlighted).length,
  );
  const occurrences = counts.reduce((sum, count) => sum + count, 0);
  const firstPage = counts.findIndex((count) => count > 0);
  const { data: lines } = useDebouncedJson(
    occurrences === 0 ? null : keywordLinesSrc(notebookId, version, keyword),
    parseKeywordLines,
  );
  return (
    <>
      {keyword !== "" && (
        <KeywordSummary
          keyword={keyword}
          occurrences={occurrences}
          pages={counts.filter((count) => count > 0).length}
        />
      )}
      {pages.length > 1 && <PageIndex pages={pages} />}
      {pages.map((page, index) => (
        <NotebookPageItem
          key={page.number}
          notebookId={notebookId}
          version={version}
          page={page}
          first={index === 0}
          segments={segmentsByPage[index]}
          firstOccurrenceId={
            index === firstPage ? FIRST_OCCURRENCE_ID : undefined
          }
          lines={lines?.get(page.number) ?? NO_LINES}
        />
      ))}
    </>
  );
}
