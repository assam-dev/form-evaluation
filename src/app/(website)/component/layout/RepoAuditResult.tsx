import Card from "./Card";
import Badge from "./Badge";
import CriteriaCard from "./CriteriaCard";
import LinkButton from "./LinkButton";
import type { RepoFacts } from "../../lib/githubAudit";
import { gradeOf, type Score } from "../../lib/evaluate";
import { formatDate, formatDateTime } from "../../lib/format";

// Full audit result of one submission: score, checks, repository details and suggestions.
export default function RepoAuditResult({
  facts,
  score,
  student,
  comment,
}: {
  facts: RepoFacts;
  score: Score;
  student?: string;
  comment?: string;
}) {
  const noCriteria = score.results.length === 0;
  const grade = gradeOf(score.finalPercent);
  const weak = score.results.filter((r) => r.status !== "Pass");

  const stats = [
    { label: "Commits", value: facts.commitCount },
    { label: "Default branch", value: facts.defaultBranch },
    { label: "Created", value: formatDate(facts.createdAt) },
    { label: "Last push", value: formatDate(facts.pushedAt) },
    { label: "Stars / Forks", value: `${facts.stars} / ${facts.forks}` },
    { label: "Audited", value: formatDateTime(facts.auditedAt) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          {noCriteria ? (
            <>
              <p className="font-semibold">Not scored yet</p>
              <p className="mt-1 text-sm text-slate-500">This project has no criteria. Add criteria to calculate marks.</p>
              <div className="mt-3">
                <LinkButton href="/criteria-builder" text="Add criteria" />
              </div>
            </>
          ) : (
            <>
              <p className="text-5xl font-bold text-[var(--colorPrimary)]">{score.finalPercent}%</p>
              <p className="text-sm text-slate-500">Compliance score</p>
              <p className="mt-2 font-semibold">
                Marks: {score.marks} / {score.totalMarks}
              </p>
              <p className="text-xs text-slate-500">
                {score.finalPoints} / {score.maxPoints} points
                {score.finalPoints !== score.aiPoints && ` (AI gave ${score.aiPoints})`}
              </p>
              <div className="mt-2">
                <Badge text={grade.text} color={grade.color} />
              </div>
            </>
          )}
        </Card>
        <div className="md:col-span-2">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold break-all">{facts.fullName}</h2>
                {student && <p className="text-sm text-slate-500">Submitted by {student}</p>}
              </div>
              <a href={facts.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--colorPrimary)] underline print:hidden">
                Open on GitHub ↗
              </a>
            </div>
            <p className="mt-2 text-sm text-slate-600">{facts.description || "No description."}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="font-medium">{s.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Criteria results</h2>
          {noCriteria && <p className="text-sm text-slate-500">No criteria yet.</p>}
          {score.results.map((r) => (
            <CriteriaCard
              key={r.criterion.id}
              name={r.criterion.name}
              status={r.status}
              detail={r.detail}
              score={r.finalScore}
              max={r.criterion.weight}
              note={r.overridden ? `Teacher changed from ${r.aiScore} to ${r.finalScore} points` : undefined}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Repository details</h2>
          {comment && (
            <Card>
              <h3 className="text-base font-semibold">Teacher comment</h3>
              <p className="mt-2 text-sm whitespace-pre-line text-slate-600">{comment}</p>
            </Card>
          )}
          <Card>
            <h3 className="text-base mb-3 font-semibold">Languages</h3>
            {facts.languages.length === 0 && <p className="text-sm text-slate-500">No code detected.</p>}
            {facts.languages.slice(0, 6).map((l) => (
              <div key={l.name} className="mb-2 flex items-center gap-3 text-sm">
                <span className="w-24 truncate text-slate-600">{l.name}</span>
                <div className="h-2.5 flex-1 rounded-full bg-slate-200">
                  <div className="h-2.5 rounded-full bg-[var(--colorPrimary)]" style={{ width: `${l.percent}%` }}></div>
                </div>
                <span className="w-12 text-right">{l.percent}%</span>
              </div>
            ))}
          </Card>
          <Card>
            <h3 className="text-base mb-3 font-semibold">Files in root folder ({facts.rootFiles.length})</h3>
            {facts.rootFiles.length === 0 && <p className="text-sm text-slate-500">The repository is empty.</p>}
            <ul className="flex flex-wrap gap-2 text-sm">
              {facts.rootFiles.map((f) => (
                <li key={f.name} className="rounded-md border border-slate-200 px-2 py-1">
                  {f.type === "dir" ? "📁" : "📄"} {f.name}
                </li>
              ))}
            </ul>
          </Card>
          {!noCriteria && (
            <Card>
              <h3 className="text-base font-semibold">Suggestions for the student</h3>
              {weak.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Every criterion passed. Nice work.</p>
              ) : (
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                  {weak.map((r) => (
                    <li key={r.criterion.id}>
                      <b>{r.criterion.name}:</b> {r.detail}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
