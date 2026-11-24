function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
}

export function TranscriptionPanel({
  notebookId,
  transcription,
}: {
  notebookId: string;
  transcription: string;
}) {
  return (
    <section
      className="fr-col-12 fr-col-lg-6"
      aria-labelledby="transcription-title"
    >
      <h2 id="transcription-title" className="fr-h4">
        Transcription
      </h2>
      <div
        className="h-[75vh] overflow-y-auto border border-[var(--border-default-grey)] fr-p-3w"
        tabIndex={0}
        role="region"
        aria-label={`Transcription du cahier ${notebookId}`}
      >
        {paragraphs(transcription).map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
