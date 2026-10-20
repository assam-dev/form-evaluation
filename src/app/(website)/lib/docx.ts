// Reads structure and text from a Word (.docx) file in the browser.

import { parseXml, readZip, readZipText } from "./zip";

export type DocxInfo = {
  title: string;
  author: string;
  pages: number | null;
  paragraphs: number;
  words: number;
  headings: { level: number; text: string }[];
  tables: number;
  images: number;
  links: string[];
  text: string;
};

export async function analyzeDocx(buffer: ArrayBuffer): Promise<DocxInfo> {
  const zip = readZip(buffer);
  const documentXml = await readZipText(zip, "word/document.xml");
  if (!documentXml) throw new Error("This file is not a Word document (word/document.xml is missing).");

  // Style id -> style name, e.g. "Heading1" -> "heading 1" (ids differ in non-English Word).
  const styleNames = new Map<string, string>();
  const stylesXml = await readZipText(zip, "word/styles.xml");
  if (stylesXml) {
    for (const s of Array.from(parseXml(stylesXml).getElementsByTagName("w:style"))) {
      const id = s.getAttribute("w:styleId");
      const name = s.getElementsByTagName("w:name")[0]?.getAttribute("w:val");
      if (id && name) styleNames.set(id, name.toLowerCase());
    }
  }

  const doc = parseXml(documentXml);
  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  const headings: DocxInfo["headings"] = [];
  const lines: string[] = [];

  for (const p of paragraphs) {
    const text = Array.from(p.getElementsByTagName("w:t"))
      .map((t) => t.textContent)
      .join("")
      .trim();
    if (!text) continue;
    lines.push(text);

    const styleId = p.getElementsByTagName("w:pStyle")[0]?.getAttribute("w:val") ?? "";
    const name = styleNames.get(styleId) ?? styleId.toLowerCase();
    const outline = p.getElementsByTagName("w:outlineLvl")[0]?.getAttribute("w:val");
    const heading = name.match(/^heading\s*(\d)/);
    if (heading) headings.push({ level: Number(heading[1]), text });
    else if (name === "title") headings.push({ level: 0, text });
    else if (outline !== null && outline !== undefined && Number(outline) < 9) headings.push({ level: Number(outline) + 1, text });
  }

  const text = lines.join("\n");

  const relsXml = await readZipText(zip, "word/_rels/document.xml.rels");
  const links = relsXml
    ? Array.from(parseXml(relsXml).getElementsByTagName("Relationship"))
        .filter((r) => r.getAttribute("TargetMode") === "External" && /hyperlink$/i.test(r.getAttribute("Type") ?? ""))
        .map((r) => r.getAttribute("Target") ?? "")
        .filter(Boolean)
    : [];

  const core = await readZipText(zip, "docProps/core.xml");
  const app = await readZipText(zip, "docProps/app.xml");
  const coreDoc = core ? parseXml(core) : null;
  const pagesText = app ? parseXml(app).getElementsByTagName("Pages")[0]?.textContent : null;

  return {
    title: coreDoc?.getElementsByTagName("dc:title")[0]?.textContent ?? "",
    author: coreDoc?.getElementsByTagName("dc:creator")[0]?.textContent ?? "",
    pages: pagesText ? Number(pagesText) : null,
    paragraphs: lines.length,
    words: text.split(/\s+/).filter(Boolean).length,
    headings,
    tables: doc.getElementsByTagName("w:tbl").length,
    images: Array.from(zip.keys()).filter((n) => n.startsWith("word/media/")).length,
    links: Array.from(new Set(links)),
    text,
  };
}
