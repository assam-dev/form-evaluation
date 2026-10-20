// Small CSV parser (no extra package needed).
// Handles commas inside quotes, escaped quotes ("") and Windows/Unix line endings.

export type CsvData = { headers: string[]; rows: string[][] };

export function parseCsv(text: string): CsvData {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  // Remove the BOM that Excel / Google Sheets sometimes add at the start.
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // Last line (file may not end with a newline).
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Drop completely empty lines.
  const clean = records.filter((r) => r.some((cell) => cell.trim() !== ""));
  const headers = (clean[0] || []).map((h) => h.trim());
  const rows = clean.slice(1).map((r) => headers.map((_, i) => (r[i] || "").trim()));
  return { headers, rows };
}

// Builds CSV text from rows (used for exports). Excel opens these files directly.
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // The BOM makes Excel read non-English characters correctly.
  return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
