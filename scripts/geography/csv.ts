// Lecteur CSV minimal (RFC 4180) : champs entre guillemets ou non, guillemets
// doublés, virgules et retours à la ligne dans un champ cité, fins de ligne
// CRLF ou LF. Les lignes vides sont ignorées.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  function endField(): void {
    row.push(field);
    field = "";
  }
  function endRow(): void {
    endField();
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') field += text[++i];
      else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ",") endField();
    else if (char === "\n") endRow();
    else if (char !== "\r") field += char;
  }
  endRow();
  return rows;
}
