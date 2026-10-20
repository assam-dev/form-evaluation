"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "./Card";
import Badge from "./Badge";
import PageTitle from "./PageTitle";
import LinkButton from "./LinkButton";
import PageLoading from "./PageLoading";
import EmptyState from "./EmptyState";
import SubmissionChooser from "./SubmissionChooser";
import { inputClass, primaryButton, secondaryButton } from "./Field";
import { evaluate } from "../../lib/evaluate";
import { formatDateTime } from "../../lib/format";
import { saveReview, useDB, type Project, type Submission } from "../../lib/store";

function ReviewForm({ sub, project, prevId, nextId }: { sub: Submission; project: Project; prevId?: string; nextId?: string }) {
  const results = evaluate(sub.facts!, project);
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(results.map((r) => [r.criterion.id, String(sub.overrides[r.criterion.id] ?? r.aiScore)])),
  );
  const [comment, setComment] = useState(sub.comment);
  const [saved, setSaved] = useState(false);

  const value = (id: string, max: number) => Math.min(max, Math.max(0, Number(marks[id]) || 0));
  const maxTotal = results.reduce((s, r) => s + r.criterion.weight, 0);
  const aiTotal = Math.round(results.reduce((s, r) => s + r.aiScore, 0) * 10) / 10;
  const teacherTotal = Math.round(results.reduce((s, r) => s + value(r.criterion.id, r.criterion.weight), 0) * 10) / 10;
  const toMarks = (points: number) => (maxTotal ? Math.round((points / maxTotal) * project.totalMarks * 10) / 10 : 0);
  const changed = results.some((r) => value(r.criterion.id, r.criterion.weight) !== r.aiScore);

  function save() {
    const overrides: Record<string, number> = {};
    results.forEach((r) => {
      const v = value(r.criterion.id, r.criterion.weight);
      if (v !== r.aiScore) overrides[r.criterion.id] = v;
    });
    saveReview(sub.id, overrides, comment.trim());
    setSaved(true);
  }

  function resetToAi() {
    setMarks(Object.fromEntries(results.map((r) => [r.criterion.id, String(r.aiScore)])));
    setSaved(false);
  }

  return (
    <div>
      <PageTitle title="Teacher Review" subtitle={`${sub.studentName || "(no name)"}${sub.roll ? `, Roll no. ${sub.roll}` : ""} · ${sub.facts?.fullName}`}>
        {prevId && <LinkButton href={`/admin-review?id=${prevId}`} text="← Previous" outline />}
        {nextId && <LinkButton href={`/admin-review?id=${nextId}`} text="Next →" outline />}
      </PageTitle>
      {results.length === 0 ? (
        <EmptyState title="No criteria" text="This project has no criteria, so there are no marks to review." href="/criteria-builder" action="Add criteria" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr><th className="p-2">Criterion</th><th className="p-2">AI result</th><th className="p-2">AI points</th><th className="p-2">Your points</th></tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.criterion.id} className="border-t border-slate-100 align-top">
                        <td className="p-2">
                          <span className="font-medium">{r.criterion.name}</span>
                          <span className="block text-xs text-slate-500">{r.detail}</span>
                        </td>
                        <td className="p-2"><Badge text={r.status} color={r.status === "Pass" ? "green" : r.status === "Partial" ? "amber" : "red"} /></td>
                        <td className="p-2 whitespace-nowrap">{r.aiScore} / {r.criterion.weight}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={r.criterion.weight}
                            step={0.5}
                            value={marks[r.criterion.id] ?? ""}
                            onChange={(e) => {
                              setMarks({ ...marks, [r.criterion.id]: e.target.value });
                              setSaved(false);
                            }}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-2"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="mt-4 block text-sm text-slate-600">
                Comment for the student
                <textarea rows={4} className={inputClass} value={comment} onChange={(e) => { setComment(e.target.value); setSaved(false); }} placeholder="Shown on the submission report" />
              </label>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={save} className={primaryButton}>Save review</button>
                <button type="button" onClick={resetToAi} className={secondaryButton}>Reset to AI marks</button>
                {saved && <span className="text-sm font-semibold text-emerald-700">Review saved.</span>}
              </div>
            </Card>
          </div>
          <div>
            <Card>
              <h2 className="text-lg font-semibold">Review summary</h2>
              <p className="mt-3 text-sm text-slate-500">AI total</p>
              <p className="text-2xl font-bold">{aiTotal} / {maxTotal} points</p>
              <p className="text-sm text-slate-500">{toMarks(aiTotal)} / {project.totalMarks} marks</p>
              <p className="mt-3 text-sm text-slate-500">Teacher total</p>
              <p className="text-2xl font-bold text-[var(--colorPrimary)]">{teacherTotal} / {maxTotal} points</p>
              <p className="text-sm text-slate-500">{toMarks(teacherTotal)} / {project.totalMarks} marks</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge text={changed ? "Marks changed" : "Same as AI"} color={changed ? "amber" : "gray"} />
                {sub.reviewed && <Badge text={`Last saved ${formatDateTime(sub.reviewedAt)}`} color="indigo" />}
              </div>
              <Link href={`/evaluation-reports/detail?id=${sub.id}`} className="mt-4 block text-sm font-semibold text-[var(--colorPrimary)] underline">
                Open submission report
              </Link>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReview({ id }: { id: string }) {
  const db = useDB();
  if (!db.ready) return <PageLoading />;
  if (!id) {
    return (
      <div>
        <PageTitle title="Teacher Review" subtitle="Choose a submission to check and change its marks." />
        <SubmissionChooser basePath="/admin-review" text="Audited submissions" />
      </div>
    );
  }
  const sub = db.submissions.find((s) => s.id === id);
  const project = sub ? db.projects.find((p) => p.id === sub.projectId) : undefined;
  if (!sub || !project) return <EmptyState title="Submission not found" text="It may have been removed." href="/admin-review" action="Choose another" />;
  if (sub.status !== "done" || !sub.facts) {
    return <EmptyState title="Not audited yet" text="Only audited submissions can be reviewed." href="/batch-progress" action="Go to Batch Progress" />;
  }
  const list = db.submissions.filter((s) => s.projectId === project.id && s.status === "done");
  const index = list.findIndex((s) => s.id === sub.id);
  // key: reset the form when switching submission or when the criteria change
  return (
    <ReviewForm
      key={`${sub.id}-${sub.facts.auditedAt}-${project.criteria.map((c) => c.id + c.weight + c.type + c.details).join()}`}
      sub={sub}
      project={project}
      prevId={list[index - 1]?.id}
      nextId={list[index + 1]?.id}
    />
  );
}
