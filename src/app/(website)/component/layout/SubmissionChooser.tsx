"use client";

import Link from "next/link";
import Card from "./Card";
import Badge from "./Badge";
import EmptyState from "./EmptyState";
import ProjectPicker from "./ProjectPicker";
import { scoreSubmission } from "../../lib/evaluate";
import { activeProjectOf, useDB } from "../../lib/store";

// List of audited submissions of the active project; each links to `${basePath}?id=...`.
export default function SubmissionChooser({ basePath, text }: { basePath: string; text: string }) {
  const db = useDB();
  const project = activeProjectOf(db);
  if (!project) return <EmptyState title="No project yet" text="Create a project and import submissions first." href="/projects/new" action="Create project" />;

  const subs = db.submissions.filter((s) => s.projectId === project.id && s.status === "done");
  return (
    <div>
      <ProjectPicker />
      {subs.length === 0 ? (
        <EmptyState title="No audited submissions" text="Import a CSV and run the audit first." href="/csv-import" action="Import CSV" />
      ) : (
        <Card>
          <p className="mb-3 text-sm text-slate-500">{text}</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {subs.map((s) => {
              const score = scoreSubmission(s, project);
              return (
                <li key={s.id}>
                  <Link href={`${basePath}?id=${s.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-[var(--colorPrimary)]">
                    <span>
                      <b>{s.studentName || "(no name)"}</b>
                      {s.roll && <span className="text-slate-500"> · Roll no. {s.roll}</span>}
                      <span className="block text-xs text-slate-500">{s.facts?.fullName}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {s.reviewed && <Badge text="Reviewed" color="indigo" />}
                      {score && score.maxPoints > 0 && <Badge text={`${score.finalPercent}%`} color="green" />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
