"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import PageTitle from "./PageTitle";
import LinkButton from "./LinkButton";
import PageLoading from "./PageLoading";
import EmptyState from "./EmptyState";
import Field, { inputClass, primaryButton } from "./Field";
import { createProject, updateProject, useDB, type Project } from "../../lib/store";

function Form({ project }: { project: Project | null }) {
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [totalMarks, setTotalMarks] = useState(String(project?.totalMarks ?? 50));
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const marks = Number(totalMarks);
    if (!name.trim()) return setError("Please enter a project name.");
    if (!Number.isFinite(marks) || marks <= 0) return setError("Total marks must be a number greater than 0.");

    const data = { name: name.trim(), description: description.trim(), deadline, totalMarks: marks };
    if (project) {
      updateProject(project.id, data);
      router.push("/projects");
    } else {
      createProject(data);
      router.push("/criteria-builder");
    }
  }

  return (
    <div>
      <PageTitle
        title={project ? "Edit project" : "New project"}
        subtitle={project ? "Change the project details." : "Create the project first, then set up its criteria."}
      />
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card>
          <Field label="Project name" value={name} onChange={setName} placeholder="e.g. Web Development Final" required />
          <label className="mb-4 block text-sm text-slate-600">
            Description
            <textarea rows={4} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What students had to build" />
          </label>
          <Field label="Deadline" type="date" value={deadline} onChange={setDeadline} hint="Used by the “Submitted before deadline” criterion." />
          <Field label="Total marks" type="number" value={totalMarks} onChange={setTotalMarks} required hint="The audit score is converted to these marks." />
          {error && <p className="mb-4 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className={primaryButton}>
              {project ? "Save changes" : "Create project"}
            </button>
            <LinkButton href="/projects" text="Cancel" outline />
          </div>
        </Card>
      </form>
    </div>
  );
}

export default function ProjectForm({ editId }: { editId: string }) {
  const db = useDB();
  if (!db.ready) return <PageLoading />;
  const project = editId ? db.projects.find((p) => p.id === editId) ?? null : null;
  if (editId && !project) return <EmptyState title="Project not found" text="It may have been deleted." href="/projects" action="Back to projects" />;
  return <Form key={editId} project={project} />;
}
