"use client";

import Card from "@/src/app/(website)/component/layout/Card";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import { dangerButton, secondaryButton } from "@/src/app/(website)/component/layout/Field";
import { clearAllData, exportAllData, useDB } from "@/src/app/(website)/lib/store";
import { downloadFile } from "@/src/app/(website)/lib/format";

const steps = [
  { title: "1. Create a project", text: "Give it a name, a deadline and the total marks." },
  { title: "2. Build the criteria", text: "Pick checks such as README, commit history, tests or required files, and give each one points." },
  { title: "3. Import the Google Form CSV", text: "The system reads the file, shows what it understood, and audits the GitHub repository right away." },
  { title: "4. Audit the rest", text: "Batch Progress audits every other submission one by one using the GitHub API." },
  { title: "5. Review and export", text: "Teachers can change the AI marks, add comments, and export the final report to Excel or PDF." },
];

export default function AboutPage() {
  const db = useDB();

  function clear() {
    if (confirm("Delete ALL projects, submissions and accounts saved in this browser? This cannot be undone.")) clearAllData();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="About" subtitle="Google Form Evaluation Platform" />
      <Card>
        <p className="text-sm text-slate-600">
          This platform helps teachers mark student projects submitted through Google Forms. Each student submits a GitHub
          repository link; the platform reads the repository through the public GitHub API and scores it against the
          criteria the teacher defines. The tools (PDF, DOCX, Excel analyzers and the Drive checker) check other kinds of
          submitted files directly in the browser.
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.title}>
            <b>{s.title}</b>
            <p className="mt-1 text-sm text-slate-500">{s.text}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-lg font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Everything is saved in this browser only ({db.projects.length} project(s), {db.submissions.length} submission(s), {db.users.length} account(s)).
          Download a backup before clearing browser data or changing computers.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={secondaryButton} onClick={() => downloadFile("form-evaluation-backup.json", exportAllData(), "application/json")}>
            Download backup (JSON)
          </button>
          <button type="button" className={dangerButton} onClick={clear}>
            Delete all data
          </button>
        </div>
      </Card>
    </div>
  );
}
