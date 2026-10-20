"use client";

import Card from "./Card";
import Badge from "./Badge";
import PageTitle from "./PageTitle";
import LinkButton from "./LinkButton";
import PageLoading from "./PageLoading";
import EmptyState from "./EmptyState";
import RepoAuditResult from "./RepoAuditResult";
import SubmissionChooser from "./SubmissionChooser";
import { primaryButton, secondaryButton } from "./Field";
import { scoreSubmission } from "../../lib/evaluate";
import { formatDate, formatDateTime } from "../../lib/format";
import { runAudit, STATUS_INFO, useDB } from "../../lib/store";

export default function SubmissionReport({ id }: { id: string }) {
  const db = useDB();
  if (!db.ready) return <PageLoading />;

  if (!id) {
    return (
      <div>
        <PageTitle title="Submission Report" subtitle="Choose a student to see the full report." />
        <SubmissionChooser basePath="/evaluation-reports/detail" text="Audited submissions" />
      </div>
    );
  }

  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) return <EmptyState title="Submission not found" text="It may have been removed." href="/evaluation-reports/detail" action="Choose another" />;
  const project = db.projects.find((p) => p.id === sub.projectId);
  const score = scoreSubmission(sub, project);
  const label = [sub.studentName || "(no name)", sub.roll && `Roll no. ${sub.roll}`].filter(Boolean).join(", ");
  const status = STATUS_INFO[sub.status];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Submission Report" subtitle={`${label} · ${project?.name ?? ""}`}>
        <span className="print:hidden"><LinkButton href={`/admin-review?id=${sub.id}`} text="Review marks" outline /></span>
        <button type="button" className={`${secondaryButton} print:hidden`} onClick={() => window.print()}>
          Print / PDF
        </button>
        <span className="print:hidden"><LinkButton href="/evaluation-reports" text="Final report" /></span>
      </PageTitle>

      <Card>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-slate-500">Status</p><Badge text={status.text} color={status.color} /> {sub.reviewed && <Badge text={`Reviewed ${formatDate(sub.reviewedAt)}`} color="indigo" />}</div>
          <div><p className="text-xs text-slate-500">Email</p><p className="break-all">{sub.email || "-"}</p></div>
          <div><p className="text-xs text-slate-500">Imported</p><p>{formatDateTime(sub.importedAt)}</p></div>
          <div><p className="text-xs text-slate-500">Repository link</p><p className="break-all">{sub.repoUrl || "-"}</p></div>
        </div>
        {sub.history.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">Audit history (AI score)</p>
            <div className="flex flex-wrap gap-2">
              {sub.history.map((h, i) => (
                <Badge key={h.date} text={`v${i + 1} · ${formatDate(h.date)} · ${h.percent}%`} color={i === sub.history.length - 1 ? "green" : "gray"} />
              ))}
            </div>
          </div>
        )}
      </Card>

      {sub.status === "done" && sub.facts && score ? (
        <>
          <RepoAuditResult facts={sub.facts} score={score} comment={sub.comment} />
          <div className="print:hidden">
            <button type="button" className={secondaryButton} onClick={() => runAudit(sub.id)}>
              Re-audit repository
            </button>
            <p className="mt-1 text-xs text-slate-500">Re-auditing reads the repository again and clears the teacher review.</p>
          </div>
        </>
      ) : (
        <Card>
          <p className="text-sm text-slate-600">
            {sub.status === "running" ? "Audit in progress…" : sub.error || "This submission has not been audited yet."}
          </p>
          {sub.status !== "running" && sub.status !== "attention" && (
            <button type="button" className={`${primaryButton} mt-3`} onClick={() => runAudit(sub.id)}>
              Audit now
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
