"use client";

import Link from "next/link";
import Card from "@/src/app/(website)/component/layout/Card";
import Badge from "@/src/app/(website)/component/layout/Badge";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import EmptyState from "@/src/app/(website)/component/layout/EmptyState";
import PageLoading from "@/src/app/(website)/component/layout/PageLoading";
import ProjectPicker from "@/src/app/(website)/component/layout/ProjectPicker";
import GithubSettings from "@/src/app/(website)/component/layout/GithubSettings";
import LinkButton from "@/src/app/(website)/component/layout/LinkButton";
import { dangerButton, primaryButton, secondaryButton } from "@/src/app/(website)/component/layout/Field";
import { scoreSubmission } from "@/src/app/(website)/lib/evaluate";
import {
  activeProjectOf,
  deleteSubmission,
  projectStats,
  runAudit,
  runQueue,
  STATUS_INFO,
  stopQueue,
  useDB,
  type Submission,
} from "@/src/app/(website)/lib/store";

export default function BatchProgressPage() {
  const db = useDB();
  if (!db.ready) return <PageLoading />;
  const project = activeProjectOf(db);

  if (!project) {
    return (
      <div>
        <PageTitle title="Batch Progress" subtitle="Audit every imported submission." />
        <EmptyState title="No project yet" text="Create a project and import a CSV to see its audit progress here." href="/projects/new" action="Create project" />
      </div>
    );
  }

  const subs = db.submissions.filter((s) => s.projectId === project.id);
  const stats = projectStats(db, project.id);
  const processed = stats.done + stats.failed + stats.attention;
  const percent = stats.total ? Math.round((processed / stats.total) * 100) : 0;
  const running = db.batchRunning;

  const counts = [
    { label: "Audited", value: stats.done },
    { label: "Queued", value: stats.queued + stats.running },
    { label: "Failed", value: stats.failed },
    { label: "Need attention", value: stats.attention },
  ];

  function remove(s: Submission) {
    if (confirm(`Remove the submission of ${s.studentName || s.roll || "this student"}?`)) deleteSubmission(s.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Batch Progress" subtitle={project.name}>
        {running ? (
          <button type="button" className={secondaryButton} onClick={stopQueue}>
            Stop after current
          </button>
        ) : (
          <>
            {stats.failed > 0 && (
              <button type="button" className={secondaryButton} onClick={() => runQueue(project.id, true)}>
                Retry failed ({stats.failed})
              </button>
            )}
            <button type="button" className={primaryButton} disabled={stats.queued === 0} onClick={() => runQueue(project.id, false)}>
              Audit queued ({stats.queued})
            </button>
          </>
        )}
      </PageTitle>
      <div className="-mt-6">
        <ProjectPicker />
      </div>

      {subs.length === 0 ? (
        <EmptyState title="No submissions in this project" text="Import the Google Form CSV to add submissions." href="/csv-import" action="Import CSV" />
      ) : (
        <>
          <Card>
            <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
              <b>{running ? "Auditing submissions…" : processed === stats.total ? "All submissions processed" : "Waiting to start"}</b>
              <span className="text-slate-500">
                Processed {processed} of {stats.total}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-200">
              <div className="h-3 rounded-full bg-[var(--colorPrimary)] transition-all" style={{ width: `${percent}%` }}></div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {counts.map((c) => (
              <Card key={c.label}>
                <div className="text-3xl font-bold">{c.value}</div>
                <div className="text-sm text-slate-500">{c.label}</div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Student</th>
                    <th className="p-2">Roll no.</th>
                    <th className="p-2">Repository</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Score</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => {
                    const score = scoreSubmission(s, project);
                    const info = STATUS_INFO[s.status];
                    return (
                      <tr key={s.id} className="border-t border-slate-100 align-top">
                        <td className="p-2">{s.csvRow}</td>
                        <td className="p-2 font-medium">{s.studentName || "-"}</td>
                        <td className="p-2">{s.roll || "-"}</td>
                        <td className="max-w-56 p-2">
                          <span className="block truncate" title={s.repoUrl}>{s.repoUrl || "(empty)"}</span>
                          {s.error && <span className="block text-xs text-red-700">{s.error}</span>}
                        </td>
                        <td className="p-2">
                          <Badge text={info.text} color={info.color} />
                          {s.reviewed && <span className="ml-1"><Badge text="Reviewed" color="indigo" /></span>}
                        </td>
                        <td className="p-2">{score && score.maxPoints ? `${score.finalPercent}%` : "-"}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {s.status === "done" && (
                              <Link href={`/evaluation-reports/detail?id=${s.id}`} className="font-semibold text-[var(--colorPrimary)]">View</Link>
                            )}
                            {(s.status === "queued" || s.status === "failed" || s.status === "done") && !running && (
                              <button type="button" className="rounded px-2 py-1 text-xs" onClick={() => runAudit(s.id)}>
                                {s.status === "queued" ? "Audit" : "Re-audit"}
                              </button>
                            )}
                            {s.status !== "running" && (
                              <button type="button" className={`${dangerButton} !px-2 !py-1 text-xs`} onClick={() => remove(s)}>
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          {stats.attention > 0 && (
            <p className="text-sm text-slate-500">
              Submissions that need attention have no valid GitHub link. Fix the link in the Google Form responses and import the CSV again — the student is updated, not added twice.
            </p>
          )}
          {stats.done > 0 && (
            <div className="flex justify-end">
              <LinkButton href="/evaluation-reports" text="Open final report →" />
            </div>
          )}
        </>
      )}
      <GithubSettings />
    </div>
  );
}
