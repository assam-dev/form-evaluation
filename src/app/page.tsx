"use client";

import Link from "next/link";
import Card from "./(website)/component/layout/Card";
import Badge from "./(website)/component/layout/Badge";
import PageTitle from "./(website)/component/layout/PageTitle";
import PageLoading from "./(website)/component/layout/PageLoading";
import { activeProjectOf, projectStats, useDB } from "./(website)/lib/store";

const pages = [
  { href: "/projects", name: "Projects", info: "Create and manage projects" },
  { href: "/criteria-builder", name: "Criteria Builder", info: "Rules and weights used for marking" },
  { href: "/csv-import", name: "Import", info: "Upload a Google Form CSV and audit the GitHub repo" },
  { href: "/batch-progress", name: "Batch Progress", info: "Audit every imported submission" },
  { href: "/evaluation-reports/detail", name: "Submission Report", info: "Detailed report for one student" },
  { href: "/admin-review", name: "Review", info: "Check and change the AI marks" },
  { href: "/evaluation-reports", name: "Final Report", info: "Results of the whole project, export to Excel or PDF" },
  { href: "/pdf-analyzer", name: "PDF Analyzer", info: "Pages, text, links and keywords of a PDF" },
  { href: "/docx-analyzer", name: "DOCX Analyzer", info: "Headings, tables and keywords of a Word file" },
  { href: "/excel-analyzer", name: "Excel Analyzer", info: "Sheets, rows and formulas of an Excel file" },
  { href: "/drive-checker", name: "Drive Checker", info: "Check a Google Drive or GitHub link" },
];

export default function Home() {
  const db = useDB();
  if (!db.ready) return <PageLoading />;

  const project = activeProjectOf(db);
  const stats = project ? projectStats(db, project.id) : null;
  const audited = db.submissions.filter((s) => s.status === "done").length;

  const steps = [
    { done: db.projects.length > 0, text: "Create a project", href: "/projects/new" },
    { done: Boolean(project && project.criteria.length), text: "Add marking criteria", href: "/criteria-builder" },
    { done: Boolean(stats && stats.total), text: "Import the Google Form CSV", href: "/csv-import" },
    { done: Boolean(stats && stats.done), text: "Audit the submissions", href: "/batch-progress" },
    { done: Boolean(stats && stats.reviewed), text: "Review marks and export the final report", href: "/admin-review" },
  ];

  const counts = [
    { label: "Projects", value: db.projects.length },
    { label: "Submissions", value: db.submissions.length },
    { label: "Audited", value: audited },
    { label: project ? `Average · ${project.name}` : "Average score", value: stats?.average === null || !stats ? "-" : `${stats.average}%` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageTitle title="Form Evaluation Platform" subtitle="Audit student GitHub submissions collected with Google Forms." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counts.map((c) => (
          <Card key={c.label}>
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="truncate text-sm text-slate-500">{c.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-lg mb-3 font-semibold">Getting started</h2>
        <ol className="flex flex-col gap-2 text-sm">
          {steps.map((s, i) => (
            <li key={s.text} className="flex items-center gap-3">
              <Badge text={s.done ? "Done" : `Step ${i + 1}`} color={s.done ? "green" : "gray"} />
              <Link href={s.href} className="font-medium text-[var(--colorPrimary)] hover:underline">
                {s.text}
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((p) => (
          <Link key={p.href} href={p.href}>
            <Card>
              <b>{p.name}</b>
              <p className="mt-1 text-sm text-slate-500">{p.info}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
