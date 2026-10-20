"use client";

import Card from "./Card";
import Badge from "./Badge";
import DocumentViewer from "./DocumentViewer";
import { inputClass } from "./Field";
import { countKeywords, splitList } from "../../lib/format";

// Lets the teacher type keywords and required sections, and checks them against
// the text of an analysed file.
export default function KeywordCheck({
  text,
  keywords,
  sections,
  onKeywords,
  onSections,
  headings,
}: {
  text: string;
  keywords: string;
  sections: string;
  onKeywords: (v: string) => void;
  onSections: (v: string) => void;
  headings?: string[]; // real headings of the document, when known
}) {
  const lower = text.toLowerCase();
  const keywordResults = countKeywords(text, splitList(keywords));
  const sectionResults = splitList(sections).map((s) => {
    const want = s.toLowerCase();
    const inHeadings = headings?.find((h) => h.toLowerCase().includes(want));
    const found = Boolean(inHeadings) || lower.includes(want);
    return { heading: s, found, where: inHeadings ? "Heading" : found ? "In text" : "Not found" };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-lg font-semibold">Keyword search</h2>
        <label className="mt-3 block text-sm text-slate-600">
          Keywords (comma separated)
          <input className={inputClass} placeholder="normalization, ER diagram, SQL" value={keywords} onChange={(e) => onKeywords(e.target.value)} />
        </label>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {keywordResults.map((k) => (
            <li key={k.keyword} className="flex items-center justify-between py-2.5">
              <span>{k.keyword}</span>
              <Badge text={k.count ? `Found ${k.count}×` : "Not found"} color={k.count ? "green" : "red"} />
            </li>
          ))}
        </ul>
        {!text && <p className="mt-3 text-sm text-amber-700">No readable text was found in this file.</p>}
      </Card>
      <div className="flex flex-col gap-3">
        <Card>
          <label className="block text-sm text-slate-600">
            Required sections (comma separated)
            <input className={inputClass} placeholder="Introduction, Methodology, Conclusion" value={sections} onChange={(e) => onSections(e.target.value)} />
          </label>
        </Card>
        {sectionResults.length > 0 && <DocumentViewer title="Required sections" sections={sectionResults} />}
      </div>
    </div>
  );
}
