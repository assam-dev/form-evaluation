// Reads sheets, rows and formulas from an Excel (.xlsx) or .csv file in the browser.

import { parseCsv } from "./csv";
import { parseXml, readZip, readZipText } from "./zip";

export type SheetInfo = { name: string; rows: number; columns: number; cells: number; formulas: number; headers: string[] };
export type ExcelInfo = { sheets: SheetInfo[]; charts: number; text: string };

function columnNumber(ref: string) {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "";
  return letters.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

export async function analyzeExcel(buffer: ArrayBuffer, fileName: string): Promise<ExcelInfo> {
  if (fileName.toLowerCase().endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer);
    const csv = parseCsv(text);
    return {
      sheets: [{ name: "CSV", rows: csv.rows.length + (csv.headers.length ? 1 : 0), columns: csv.headers.length, cells: csv.rows.reduce((n, r) => n + r.filter(Boolean).length, 0) + csv.headers.length, formulas: 0, headers: csv.headers }],
      charts: 0,
      text,
    };
  }
  if (fileName.toLowerCase().endsWith(".xls")) {
    throw new Error("Old .xls files are not supported. Open it in Excel and save as .xlsx.");
  }

  const zip = readZip(buffer);
  const workbookXml = await readZipText(zip, "xl/workbook.xml");
  if (!workbookXml) throw new Error("This file is not an Excel workbook (xl/workbook.xml is missing).");

  const shared: string[] = [];
  const sharedXml = await readZipText(zip, "xl/sharedStrings.xml");
  if (sharedXml) {
    for (const si of Array.from(parseXml(sharedXml).getElementsByTagName("si"))) {
      shared.push(Array.from(si.getElementsByTagName("t")).map((t) => t.textContent).join(""));
    }
  }

  const rels = new Map<string, string>();
  const relsXml = await readZipText(zip, "xl/_rels/workbook.xml.rels");
  if (relsXml) {
    for (const r of Array.from(parseXml(relsXml).getElementsByTagName("Relationship"))) {
      const target = r.getAttribute("Target") ?? "";
      rels.set(r.getAttribute("Id") ?? "", target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    }
  }

  const sheets: SheetInfo[] = [];
  for (const s of Array.from(parseXml(workbookXml).getElementsByTagName("sheet"))) {
    const path = rels.get(s.getAttribute("r:id") ?? "");
    const xml = path ? await readZipText(zip, path) : null;
    const info: SheetInfo = { name: s.getAttribute("name") ?? "Sheet", rows: 0, columns: 0, cells: 0, formulas: 0, headers: [] };
    if (xml) {
      const doc = parseXml(xml);
      const rows = Array.from(doc.getElementsByTagName("row"));
      rows.forEach((row, index) => {
        let used = false;
        for (const c of Array.from(row.getElementsByTagName("c"))) {
          const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
          const isText = c.getElementsByTagName("is")[0]?.textContent ?? "";
          const hasFormula = c.getElementsByTagName("f").length > 0;
          if (!v && !isText && !hasFormula) continue;
          used = true;
          info.cells++;
          if (hasFormula) info.formulas++;
          info.columns = Math.max(info.columns, columnNumber(c.getAttribute("r") ?? ""));
          if (index === 0) info.headers.push(c.getAttribute("t") === "s" ? shared[Number(v)] ?? "" : isText || v);
        }
        if (used) info.rows++;
      });
    }
    sheets.push(info);
  }

  return {
    sheets,
    charts: Array.from(zip.keys()).filter((n) => /^xl\/charts\/chart\d*\.xml$/.test(n)).length,
    text: shared.join("\n"),
  };
}
