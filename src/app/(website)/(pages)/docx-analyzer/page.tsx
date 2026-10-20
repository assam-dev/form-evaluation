"use client";

import { useState } from "react";
import Card from "@/src/app/(website)/component/layout/Card";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import InfoList from "@/src/app/(website)/component/layout/InfoList";
import KeywordCheck from "@/src/app/(website)/component/layout/KeywordCheck";
import { primaryButton } from "@/src/app/(website)/component/layout/Field";
import { analyzeDocx, type DocxInfo } from "@/src/app/(website)/lib/docx";
import { formatBytes } from "@/src/app/(website)/lib/format";

export default function DocxAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<DocxInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [sections, setSections] = useState("");

  async function handleAnalyze() {
    if (!file) return setError("Please choose a Word (.docx) file first.");
    if (file.name.toLowerCase().endsWith(".doc")) return setError("Old .doc files are not supported. Open it in Word and save as .docx.");
    setBusy(true);
    setError("");
    setInfo(null);
    try {
      setInfo(await analyzeDocx(await file.arrayBuffer()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="DOCX Analyzer" subtitle="Check the headings, tables, images and keywords of a Word file. The file never leaves your computer." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-semibold">Choose a Word file</p>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="text-sm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setInfo(null);
              setError("");
            }}
          />
          {file && <p className="mt-2 text-sm text-slate-500">Selected: {file.name} ({formatBytes(file.size)})</p>}
          <button type="button" onClick={handleAnalyze} disabled={busy} className={`${primaryButton} mt-4 block`}>
            {busy ? "Analyzing…" : "Analyze"}
          </button>
          {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        </Card>
        {info ? (
          <InfoList
            title={`Result for ${file?.name}`}
            items={[
              { label: "Pages (saved by Word)", value: info.pages ?? "Unknown" },
              { label: "Headings", value: info.headings.length },
              { label: "Paragraphs", value: info.paragraphs },
              { label: "Word count", value: info.words.toLocaleString() },
              { label: "Tables", value: info.tables },
              { label: "Images", value: info.images },
              { label: "Hyperlinks", value: info.links.length },
              { label: "Title", value: info.title || "-" },
              { label: "Author", value: info.author || "-" },
            ]}
          />
        ) : (
          <Card>
            <h2 className="text-lg font-semibold">Analysis result</h2>
            <p className="mt-3 text-sm text-slate-500">Choose a file and press Analyze to see the result.</p>
          </Card>
        )}
      </div>

      {info && (
        <>
          <Card>
            <h2 className="text-lg mb-3 font-semibold">Document outline</h2>
            {info.headings.length === 0 ? (
              <p className="text-sm text-slate-500">No headings found. The document does not use Word heading styles.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {info.headings.map((h, i) => (
                  <li key={i} style={{ paddingLeft: `${Math.max(0, h.level - 1) * 1.25}rem` }} className={h.level <= 1 ? "font-semibold" : ""}>
                    {h.text}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <KeywordCheck
            text={info.text}
            keywords={keywords}
            sections={sections}
            onKeywords={setKeywords}
            onSections={setSections}
            headings={info.headings.map((h) => h.text)}
          />
          {info.links.length > 0 && (
            <Card>
              <h2 className="text-lg mb-3 font-semibold">Hyperlinks</h2>
              <ul className="space-y-1 text-sm break-all">
                {info.links.map((l) => (
                  <li key={l}><a href={l} target="_blank" rel="noopener noreferrer" className="text-[var(--colorPrimary)] underline">{l}</a></li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
