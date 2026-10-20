"use client";

import { useState } from "react";
import Card from "@/src/app/(website)/component/layout/Card";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import InfoList from "@/src/app/(website)/component/layout/InfoList";
import Badge from "@/src/app/(website)/component/layout/Badge";
import { primaryButton } from "@/src/app/(website)/component/layout/Field";
import { analyzeExcel, type ExcelInfo } from "@/src/app/(website)/lib/xlsx";
import { formatBytes } from "@/src/app/(website)/lib/format";

export default function ExcelAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<ExcelInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAnalyze() {
    if (!file) return setError("Please choose an Excel or CSV file first.");
    setBusy(true);
    setError("");
    setInfo(null);
    try {
      setInfo(await analyzeExcel(await file.arrayBuffer(), file.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  const total = (key: "rows" | "cells" | "formulas") => (info ? info.sheets.reduce((n, s) => n + s[key], 0) : 0);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Excel Analyzer" subtitle="Check the sheets, rows and formulas of an Excel file. The file never leaves your computer." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-semibold">Choose a file (.xlsx or .csv)</p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
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
              { label: "Sheets", value: info.sheets.length },
              { label: "Rows with data", value: total("rows").toLocaleString() },
              { label: "Filled cells", value: total("cells").toLocaleString() },
              { label: "Formulas", value: total("formulas").toLocaleString() },
              { label: "Charts", value: info.charts },
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
        <Card>
          <h2 className="text-lg mb-3 font-semibold">Sheets</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr><th className="p-2">Sheet</th><th className="p-2">Rows</th><th className="p-2">Columns</th><th className="p-2">Cells</th><th className="p-2">Formulas</th><th className="p-2">First row (headers)</th></tr>
              </thead>
              <tbody>
                {info.sheets.map((s) => (
                  <tr key={s.name} className="border-t border-slate-100 align-top">
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2">{s.rows}</td>
                    <td className="p-2">{s.columns}</td>
                    <td className="p-2">{s.cells}</td>
                    <td className="p-2">{s.formulas > 0 ? <Badge text={String(s.formulas)} color="green" /> : 0}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {s.headers.slice(0, 12).map((h, i) => <Badge key={i} text={h || "(empty)"} color="gray" />)}
                        {s.headers.length > 12 && <span className="text-xs text-slate-500">+{s.headers.length - 12} more</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
