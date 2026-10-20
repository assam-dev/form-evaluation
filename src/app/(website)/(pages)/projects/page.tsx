"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/src/app/(website)/component/layout/Card";
import Badge from "@/src/app/(website)/component/layout/Badge";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import LinkButton from "@/src/app/(website)/component/layout/LinkButton";
import EmptyState from "@/src/app/(website)/component/layout/EmptyState";
import PageLoading from "@/src/app/(website)/component/layout/PageLoading";
import { dangerButton } from "@/src/app/(website)/component/layout/Field";
import { deleteProject, projectStats, setActiveProject, useDB, type DB, type Project } from "@/src/app/(website)/lib/store";
import { formatDate } from "@/src/app/(website)/lib/format";

function projectStatus(db: DB, p: Project) {
  const s = projectStats(db, p.id);
  if (p.criteria.length === 0) return { text: "Draft", color: "gray" };
  if (s.total === 0) return { text: "Awaiting CSV", color: "gray" };
  if (s.queued + s.running > 0) return { text: "Auditing", color: "indigo" };
  return { text: "Completed", color: "green" };
}

export default function ProjectsPage() {
  const db = useDB();
  const router = useRouter();
  if (!db.ready) return <PageLoading />;

  function open(id: string, href: string) {
    setActiveProject(id);
    router.push(href);
  }

  function remove(p: Project) {
    const count = db.submissions.filter((s) => s.projectId === p.id).length;
    if (confirm(`Delete "${p.name}" and its ${count} submission(s)? This cannot be undone.`)) deleteProject(p.id);
  }

  return (
    <div>
      <PageTitle title="Projects" subtitle="Each project has its own criteria and submissions.">
        <LinkButton href="/projects/new" text="+ New project" />
      </PageTitle>

      {db.projects.length === 0 ? (
        <EmptyState title="No projects yet" text="Create your first project, then add its marking criteria and import the Google Form CSV." href="/projects/new" action="Create project" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...db.projects].reverse().map((p) => {
            const s = projectStats(db, p.id);
            const status = projectStatus(db, p);
            const actions = [
              { text: "Criteria", href: "/criteria-builder" },
              { text: "Import", href: "/csv-import" },
              { text: "Progress", href: "/batch-progress" },
              { text: "Report", href: "/evaluation-reports" },
            ];
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
                  <Badge text={status.text} color={status.color} />
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-slate-500">Deadline</dt><dd>{formatDate(p.deadline)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Total marks</dt><dd>{p.totalMarks}</dd></div>
                  <div><dt className="text-xs text-slate-500">Criteria</dt><dd>{p.criteria.length}</dd></div>
                  <div><dt className="text-xs text-slate-500">Submissions</dt><dd>{s.done} / {s.total} audited</dd></div>
                  <div><dt className="text-xs text-slate-500">Average</dt><dd>{s.average === null ? "-" : `${s.average}%`}</dd></div>
                  <div><dt className="text-xs text-slate-500">Reviewed</dt><dd>{s.reviewed}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {actions.map((a) => (
                    <a key={a.text} href={a.href} onClick={(e) => { e.preventDefault(); open(p.id, a.href); }} className="font-semibold text-[var(--colorPrimary)] hover:underline">
                      {a.text}
                    </a>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <Link href={`/projects/new?edit=${p.id}`} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Edit</Link>
                  <button type="button" className={dangerButton} onClick={() => remove(p)}>Delete</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
