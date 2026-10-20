"use client";

import Card from "@/src/app/(website)/component/layout/Card";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import EmptyState from "@/src/app/(website)/component/layout/EmptyState";
import PageLoading from "@/src/app/(website)/component/layout/PageLoading";
import ProjectPicker from "@/src/app/(website)/component/layout/ProjectPicker";
import ReportTable, { type ReportRow } from "@/src/app/(website)/component/layout/ReportTable";
import { primaryButton, secondaryButton } from "@/src/app/(website)/component/layout/Field";
import { scoreSubmission } from "@/src/app/(website)/lib/evaluate";
import { toCsv } from "@/src/app/(website)/lib/csv";
import { downloadFile, formatDate } from "@/src/app/(website)/lib/format";
import { activeProjectOf, projectStats, STATUS_INFO, useDB } from "@/src/app/(website)/lib/store";

const BUCKETS = [
  { label: "90-100", min: 90, max: 100 },
  { label: "70-89", min: 70, max: 89 },
  { label: "50-69", min: 50, max: 69 },
  { label: "Below 50", min: 0, max: 49 },
];

export default function FinalReportPage() {
  const db = useDB();
  if (!db.ready) return <PageLoading />;
  const project = activeProjectOf(db);

  if (!project) {
    return (
      <div>
        <PageTitle title="Final Report" subtitle="Results of the whole project." />
        <EmptyState title="No project yet" text="Create a project and audit its submissions to see the final report." href="/projects/new" action="Create project" />
      </div>
    );
  }

  const subs = db.submissions.filter((s) => s.projectId === project.id);
  const stats = projectStats(db, project.id);
  const scored = subs.map((s) => ({ sub: s, score: scoreSubmission(s, project) }));
  const percents = scored.filter((x) => x.score && x.score.maxPoints > 0).map((x) => x.score!.finalPercent);
  const highest = percents.length ? Math.max(...percents) : null;
  const lowest = percents.length ? Math.min(...percents) : null;

  const rows: ReportRow[] = scored
    .map(({ sub, score }) => {
      const has = Boolean(score && score.maxPoints > 0);
      const status = sub.reviewed ? { text: "Reviewed", color: "indigo" } : sub.status === "done" ? { text: "Auto", color: "green" } : STATUS_INFO[sub.status];
      return {
        id: sub.id,
        name: sub.studentName,
        roll: sub.roll,
        percent: has ? score!.finalPercent : null,
        marks: has ? score!.marks : null,
        totalMarks: project.totalMarks,
        status: status.text,
        statusColor: status.color,
      };
    })
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));

  function exportCsv() {
    const header = ["Student", "Roll no.", "Email", "Repository", "Status", "Reviewed", "AI score %", "Final score %", `Marks (/${project!.totalMarks})`, ...project!.criteria.map((c) => `${c.name} (/${c.weight})`), "Teacher comment"];
    const lines = scored.map(({ sub, score }) => [
      sub.studentName,
      sub.roll,
      sub.email,
      sub.repoUrl,
      STATUS_INFO[sub.status].text,
      sub.reviewed ? "Yes" : "No",
      score ? score.aiPercent : "",
      score ? score.finalPercent : "",
      score ? score.marks : "",
      ...project!.criteria.map((c) => score?.results.find((r) => r.criterion.id === c.id)?.finalScore ?? ""),
      sub.comment,
    ]);
    const safeName = project!.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadFile(`${safeName}-final-report.csv`, toCsv([header, ...lines]));
  }

  const summary = [
    { label: "Submissions", value: stats.total },
    { label: "Average score", value: stats.average === null ? "-" : `${stats.average}%` },
    { label: "Highest / Lowest", value: highest === null ? "-" : `${highest}% / ${lowest}%` },
    { label: "Reviewed manually", value: stats.reviewed },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Final Report" subtitle={`${project.name}${project.deadline ? ` · Deadline ${formatDate(project.deadline)}` : ""} · Total ${project.totalMarks} marks`}>
        <button type="button" onClick={exportCsv} disabled={subs.length === 0} className={`${secondaryButton} print:hidden`}>
          Export Excel (CSV)
        </button>
        <button type="button" onClick={() => window.print()} disabled={subs.length === 0} className={`${primaryButton} print:hidden`}>
          Export PDF
        </button>
      </PageTitle>
      <div className="-mt-6 print:hidden">
        <ProjectPicker />
      </div>

      {subs.length === 0 ? (
        <EmptyState title="No submissions yet" text="Import the Google Form CSV and run the audit to build the final report." href="/csv-import" action="Import CSV" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summary.map((s) => (
              <Card key={s.label}>
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </Card>
            ))}
          </div>
          {stats.done < stats.total && (
            <p className="text-sm text-amber-800">
              {stats.total - stats.done} of {stats.total} submission(s) are not audited yet, so they have no score.
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <h2 className="text-lg mb-4 font-semibold">Score distribution</h2>
              {percents.length === 0 && <p className="text-sm text-slate-500">No scores yet{project.criteria.length === 0 ? " — add criteria first" : ""}.</p>}
              {percents.length > 0 &&
                BUCKETS.map((b) => {
                  const count = percents.filter((p) => p >= b.min && p <= b.max).length;
                  const share = Math.round((count / percents.length) * 100);
                  return (
                    <div key={b.label} className="mb-3 flex items-center gap-3 text-sm">
                      <span className="w-16 text-slate-500">{b.label}</span>
                      <div className="h-3 flex-1 rounded-full bg-slate-200">
                        <div className="h-3 rounded-full bg-[var(--colorPrimary)]" style={{ width: `${share}%` }}></div>
                      </div>
                      <span className="w-20 text-right">{count} ({share}%)</span>
                    </div>
                  );
                })}
            </Card>
            <div className="lg:col-span-2">
              <ReportTable rows={rows} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
