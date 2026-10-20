"use client";

import { useState } from "react";
import Card from "@/src/app/(website)/component/layout/Card";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import InfoList from "@/src/app/(website)/component/layout/InfoList";
import KeywordCheck from "@/src/app/(website)/component/layout/KeywordCheck";
import { primaryButton } from "@/src/app/(website)/component/layout/Field";
import { analyzePdf, type PdfInfo } from "@/src/app/(website)/lib/pdf";
import { formatBytes } from "@/src/app/(website)/lib/format";

export default function PdfAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [sections, setSections] = useState("");

  async function handleAnalyze() {
    if (!file) return setError("Please choose a PDF file first.");
    setBusy(true);
    setError("");
    setInfo(null);
    try {
      setInfo(await analyzePdf(await file.arrayBuffer()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this PDF.");
    } finally {
      setBusy(false);
    }
  }

  const readable = info ? info.words > 0 : false;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="PDF Analyzer" subtitle="Check the pages, text, links and keywords of a PDF. The file never leaves your computer." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-semibold">Choose a PDF</p>
          <input
            type="file"
            accept=".pdf,application/pdf"
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
              { label: "Pages", value: info.pages || "Unknown" },
              { label: "PDF version", value: info.version },
              { label: "Text layer", value: info.hasFonts ? (readable ? "Yes" : "Fonts found, text could not be decoded") : "No (scanned / image PDF)" },
              { label: "Words extracted", value: info.words.toLocaleString() },
              { label: "Images", value: info.images },
              { label: "Links", value: info.links.length },
              { label: "Title", value: info.title || "-" },
              { label: "Author", value: info.author || "-" },
              { label: "Created with", value: info.creator || "-" },
              { label: "Password protected", value: info.encrypted ? "Yes (text cannot be read)" : "No" },
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
          <KeywordCheck text={info.text} keywords={keywords} sections={sections} onKeywords={setKeywords} onSections={setSections} />
          {info.links.length > 0 && (
            <Card>
              <h2 className="text-lg mb-3 font-semibold">Links in the PDF</h2>
              <ul className="space-y-1 text-sm break-all">
                {info.links.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer" className="text-[var(--colorPrimary)] underline">{l}</a>
                    {/github\.com\/[^/]+\/[^/]+/i.test(l) && <span className="ml-2 text-xs font-semibold text-emerald-700">GitHub repository</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {readable && (
            <Card>
              <details>
                <summary className="cursor-pointer font-semibold">Extracted text (first 3,000 characters)</summary>
                <pre className="mt-3 max-h-96 overflow-auto text-xs whitespace-pre-wrap text-slate-600">{info.text.slice(0, 3000)}</pre>
              </details>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
