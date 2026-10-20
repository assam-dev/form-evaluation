// Small helpers shared by several pages.

export function formatDate(text: string) {
  if (!text) return "-";
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return text;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(text: string) {
  if (!text) return "-";
  return new Date(text).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Starts a file download in the browser.
export function downloadFile(fileName: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Splits "a, b,c" into ["a", "b", "c"].
export function splitList(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Counts how many times each keyword appears in a text (case-insensitive).
export function countKeywords(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.map((k) => {
    const word = k.toLowerCase();
    let count = 0;
    let at = lower.indexOf(word);
    while (word && at !== -1) {
      count++;
      at = lower.indexOf(word, at + word.length);
    }
    return { keyword: k, count };
  });
}
