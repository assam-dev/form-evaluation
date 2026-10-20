"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/src/app/(website)/component/layout/Card";
import Badge from "@/src/app/(website)/component/layout/Badge";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import LinkButton from "@/src/app/(website)/component/layout/LinkButton";
import EmptyState from "@/src/app/(website)/component/layout/EmptyState";
import PageLoading from "@/src/app/(website)/component/layout/PageLoading";
import ProjectPicker from "@/src/app/(website)/component/layout/ProjectPicker";
import GithubSettings from "@/src/app/(website)/component/layout/GithubSettings";
import CsvPreview from "@/src/app/(website)/component/layout/CsvPreview";
import RepoAuditResult from "@/src/app/(website)/component/layout/RepoAuditResult";
import { inputClass, primaryButton, secondaryButton } from "@/src/app/(website)/component/layout/Field";
import { parseCsv, type CsvData } from "@/src/app/(website)/lib/csv";
import { parseGithubUrl } from "@/src/app/(website)/lib/githubAudit";
import { scoreSubmission } from "@/src/app/(website)/lib/evaluate";
import { activeProjectOf, importSubmissions, runAudit, STATUS_INFO, useDB } from "@/src/app/(website)/lib/store";

// Guess a column by its header name.
function findColumn(headers: string[], words: string[]) {
  return headers.findIndex((h) => words.some((w) => h.toLowerCase().includes(w)));
}

// Pick the column that has the most GitHub links in it.
function findLinkColumn(csv: CsvData) {
  let best = -1;
  let bestCount = 0;
  csv.headers.forEach((_, col) => {
    const count = csv.rows.filter((r) => parseGithubUrl(r[col] || "")).length;
    if (count > bestCount) {
      best = col;
      bestCount = count;
    }
  });
  return best >= 0 ? best : findColumn(csv.headers, ["github", "repo", "link", "url"]);
}

type ImportSummary = { added: number; updated: number; attention: number; queued: number; auditedId: string | null };

export default function CsvImportPage() {
  const db = useDB();
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState<CsvData | null>(null);
  const [fileError, setFileError] = useState("");
  const [nameCol, setNameCol] = useState(-1);
  const [rollCol, setRollCol] = useState(-1);
  const [emailCol, setEmailCol] = useState(-1);
  const [linkCol, setLinkCol] = useState(-1);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [inputKey, setInputKey] = useState(0);

  if (!db.ready) return <PageLoading />;
  const project = activeProjectOf(db);

  function loadCsvText(text: string, name: string) {
    const data = parseCsv(text);
    setSummary(null);
    setFileName(name);
    if (data.headers.length === 0 || data.rows.length === 0) {
      setCsv(null);
      setFileError("This CSV is empty or has only a header row.");
      return;
    }
    setFileError("");
    setCsv(data);
    setNameCol(findColumn(data.headers, ["name"]));
    setRollCol(findColumn(data.headers, ["roll", "reg", "student id", "enrol"]));
    setEmailCol(findColumn(data.headers, ["email", "e-mail"]));
    setLinkCol(findLinkColumn(data));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsv(null);
      setFileName(file.name);
      setFileError("Please choose a .csv file (Google Form → Responses → ⋮ → Download responses).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => loadCsvText(String(reader.result || ""), file.name);
    reader.onerror = () => setFileError("Could not read this file.");
    reader.readAsText(file);
  }

  function reset() {
    setCsv(null);
    setFileName("");
    setFileError("");
    setSummary(null);
    setInputKey((k) => k + 1);
  }

  const cell = (row: string[], col: number) => (col >= 0 ? (row[col] || "").trim() : "");
  const repoRows = csv && linkCol >= 0 ? csv.rows.map((row, index) => ({ row, index })).filter((r) => parseGithubUrl(r.row[linkCol] || "")) : [];
  const first = repoRows[0];

  async function importAndAudit() {
    if (!csv || !project) return;
    const rows = csv.rows.map((row, i) => ({
      studentName: cell(row, nameCol),
      roll: cell(row, rollCol),
      email: cell(row, emailCol),
      repoUrl: cell(row, linkCol),
      csvRow: i + 1,
    }));
    const result = importSubmissions(project.id, rows);
    const firstId = first ? result.ids[first.index] : null;
    const attention = rows.filter((r) => !parseGithubUrl(r.repoUrl)).length;
    setSummary({
      added: result.added,
      updated: result.updated,
      attention,
      queued: rows.length - attention - (firstId ? 1 : 0),
      auditedId: firstId,
    });
    if (firstId) await runAudit(firstId);
  }

  function columnSelect(label: string, value: number, onChange: (v: number) => void) {
    return (
      <label className="text-sm text-slate-600">
        {label}
        <select className={inputClass} value={value} disabled={Boolean(summary)} onChange={(e) => onChange(Number(e.target.value))}>
          <option value={-1}>(not in file)</option>
          {csv?.headers.map((h, i) => (
            <option key={h + i} value={i}>{h || `Column ${i + 1}`}</option>
          ))}
        </select>
      </label>
    );
  }

  const audited = summary?.auditedId ? db.submissions.find((s) => s.id === summary.auditedId) : null;
  const auditedScore = audited ? scoreSubmission(audited, project ?? undefined) : null;
  const studentLabel = audited ? [audited.studentName, audited.roll && `Roll no. ${audited.roll}`].filter(Boolean).join(", ") : "";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Import Submissions" subtitle="Upload the CSV downloaded from Google Forms. Its GitHub repository is audited on this page." />

      {!project ? (
        <EmptyState title="No project yet" text="Submissions are imported into a project. Create a project and its criteria first." href="/projects/new" action="Create project" />
      ) : (
        <>
          <div className="-mb-6">
            <ProjectPicker />
          </div>
          {project.criteria.length === 0 && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-amber-800">
                  <b>{project.name}</b> has no criteria yet. You can still import and audit, but marks are calculated only after you add criteria.
                </p>
                <LinkButton href="/criteria-builder" text="Add criteria" outline />
              </div>
            </Card>
          )}

          {/* Step 1: upload */}
          <Card>
            <p className="mb-1 font-semibold">1. Choose the Google Forms CSV</p>
            <p className="mb-3 text-sm text-slate-500">The file needs a column with a GitHub repository link, e.g. https://github.com/user/project</p>
            <div className="flex flex-wrap items-center gap-4">
              <input key={inputKey} type="file" accept=".csv,text/csv" className="text-sm" onChange={handleFileChange} />
              {(csv || fileError) && (
                <button type="button" onClick={reset} className={secondaryButton}>
                  Clear
                </button>
              )}
            </div>
            {fileError && <p className="mt-3 text-sm font-semibold text-red-700">{fileError}</p>}
          </Card>

          {csv && (
            <>
              {/* Step 2: what the system understood */}
              <Card>
                <h2 className="text-lg mb-1 font-semibold">2. Map columns</h2>
                <p className="mb-3 text-sm text-slate-500">Columns were detected automatically. Change them if something is wrong.</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {columnSelect("Student name", nameCol, setNameCol)}
                  {columnSelect("Roll number", rollCol, setRollCol)}
                  {columnSelect("Email", emailCol, setEmailCol)}
                  {columnSelect("GitHub repository link", linkCol, setLinkCol)}
                </div>
              </Card>

              <CsvPreview fileName={fileName} csv={csv} nameCol={nameCol} rollCol={rollCol} linkCol={linkCol} />

              {/* Step 3: import + the one repository to audit */}
              <Card>
                <h2 className="text-lg mb-3 font-semibold">3. Import and audit</h2>
                {first ? (
                  <>
                    <p className="mb-3 text-sm text-slate-600">
                      All {csv.rows.length} row(s) will be saved to <b>{project.name}</b>. This repository is audited right now:
                    </p>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div><p className="text-xs text-slate-500">CSV row</p><p className="font-medium">{first.index + 1}</p></div>
                      <div><p className="text-xs text-slate-500">Student</p><p className="font-medium">{cell(first.row, nameCol) || "-"}</p></div>
                      <div><p className="text-xs text-slate-500">Roll no.</p><p className="font-medium">{cell(first.row, rollCol) || "-"}</p></div>
                      <div>
                        <p className="text-xs text-slate-500">Repository</p>
                        <p className="font-medium break-all">{parseGithubUrl(first.row[linkCol])?.owner}/{parseGithubUrl(first.row[linkCol])?.repo}</p>
                      </div>
                    </div>
                    {repoRows.length > 1 && (
                      <p className="mt-3 text-sm text-slate-500">
                        {repoRows.length} GitHub links were found. The other {repoRows.length - 1} are queued and can be audited from Batch Progress.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge text="No repository" color="red" />
                    <p className="text-sm text-slate-600">No valid GitHub repository link in the selected column. Choose another column above.</p>
                  </div>
                )}
                {!summary && (
                  <button type="button" onClick={importAndAudit} disabled={!first} className={`${primaryButton} mt-4`}>
                    Import {csv.rows.length} submission(s) and start audit
                  </button>
                )}
                {summary && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <p>
                      ✔ Imported into <b>{project.name}</b>: {summary.added} new, {summary.updated} updated
                      {summary.attention > 0 && `, ${summary.attention} need attention (missing or non-GitHub link)`}.
                    </p>
                    {summary.queued > 0 && (
                      <p className="mt-1">
                        {summary.queued} more submission(s) are queued. <Link href="/batch-progress" className="font-semibold text-[var(--colorPrimary)] underline">Audit them in Batch Progress →</Link>
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Step 4: result on the same page */}
          {audited && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold">4. Audit result</h2>
                <Badge text={STATUS_INFO[audited.status].text} color={STATUS_INFO[audited.status].color} />
              </div>
              {(audited.status === "running" || audited.status === "queued") && (
                <Card>
                  <p className="text-sm text-slate-600">Reading repository info, commits, languages, files and README from GitHub…</p>
                </Card>
              )}
              {audited.status === "failed" && (
                <Card>
                  <p className="text-sm font-semibold text-red-700">{audited.error}</p>
                  <button type="button" className={`${primaryButton} mt-3`} onClick={() => runAudit(audited.id)}>
                    Try again
                  </button>
                </Card>
              )}
              {audited.status === "done" && audited.facts && auditedScore && (
                <>
                  <RepoAuditResult facts={audited.facts} score={auditedScore} student={studentLabel} />
                  <div className="mt-6 flex flex-wrap gap-3">
                    <LinkButton href={`/admin-review?id=${audited.id}`} text="Review marks" outline />
                    <LinkButton href={`/evaluation-reports/detail?id=${audited.id}`} text="Open full report" />
                  </div>
                </>
              )}
            </div>
          )}

          <GithubSettings />
        </>
      )}
    </div>
  );
}
