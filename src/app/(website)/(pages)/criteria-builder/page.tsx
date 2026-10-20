"use client";

import { useState } from "react";
import Card from "@/src/app/(website)/component/layout/Card";
import Badge from "@/src/app/(website)/component/layout/Badge";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import EmptyState from "@/src/app/(website)/component/layout/EmptyState";
import PageLoading from "@/src/app/(website)/component/layout/PageLoading";
import ProjectPicker from "@/src/app/(website)/component/layout/ProjectPicker";
import LinkButton from "@/src/app/(website)/component/layout/LinkButton";
import { dangerButton, inputClass, primaryButton, secondaryButton } from "@/src/app/(website)/component/layout/Field";
import {
  activeProjectOf,
  addCriterion,
  addRecommendedCriteria,
  deleteCriterion,
  updateCriterion,
  useDB,
  type CriterionType,
} from "@/src/app/(website)/lib/store";
import { CRITERION_TYPES } from "@/src/app/(website)/lib/evaluate";

const TYPES = Object.entries(CRITERION_TYPES) as [CriterionType, (typeof CRITERION_TYPES)[CriterionType]][];

export default function CriteriaBuilderPage() {
  const db = useDB();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newType, setNewType] = useState<CriterionType>("readme");

  if (!db.ready) return <PageLoading />;
  const project = activeProjectOf(db);
  if (!project) {
    return (
      <div>
        <PageTitle title="Criteria Builder" subtitle="Define what the audit checks and how many points each rule is worth." />
        <EmptyState title="No project yet" text="Criteria belong to a project. Create a project first." href="/projects/new" action="Create project" />
      </div>
    );
  }

  const criteria = project.criteria;
  const current = criteria.find((c) => c.id === selectedId) ?? criteria[0] ?? null;
  const totalWeight = Math.round(criteria.reduce((sum, c) => sum + c.weight, 0) * 10) / 10;
  const info = current ? CRITERION_TYPES[current.type] : null;
  const audited = db.submissions.filter((s) => s.projectId === project.id && s.status === "done").length;

  function remove(id: string, name: string) {
    if (confirm(`Delete the criterion "${name}"?`)) {
      deleteCriterion(project!.id, id);
      setSelectedId(null);
    }
  }

  return (
    <div>
      <PageTitle title="Criteria Builder" subtitle="Define what the audit checks and how many points each rule is worth.">
        <Badge text={`Total weight: ${totalWeight} points`} color={totalWeight === 100 ? "green" : "amber"} />
      </PageTitle>
      <ProjectPicker />

      <p className="mb-4 text-sm text-slate-500">
        Changes are saved automatically. Marks are calculated as (points earned ÷ total weight) × {project.totalMarks} marks
        {totalWeight !== 100 && criteria.length > 0 && " — a total weight of 100 is easiest to read"}.
        {audited > 0 && ` The ${audited} audited submission(s) are re-scored instantly when you change criteria.`}
      </p>

      {criteria.length === 0 ? (
        <Card>
          <div className="py-6 text-center">
            <h2 className="text-lg font-semibold">This project has no criteria</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Start with the recommended set (10 checks, 100 points) and edit it, or add your own criteria one by one.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button type="button" className={primaryButton} onClick={() => addRecommendedCriteria(project.id)}>
                Add recommended criteria
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {criteria.map((c) => {
            const selected = current?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-xl !bg-transparent !p-0 text-left font-normal ${selected ? "ring-2 ring-[var(--colorPrimary)]" : ""}`}
              >
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <b className="text-slate-900">{c.name || "(no name)"}</b>
                      <p className="truncate text-sm text-slate-500">
                        {CRITERION_TYPES[c.type].label}
                        {c.details && ` · ${c.details}`}
                      </p>
                    </div>
                    <Badge text={`${c.weight} pts`} color="indigo" />
                  </div>
                </Card>
              </button>
            );
          })}

          <Card>
            <p className="mb-2 font-semibold">Add a criterion</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-56 flex-1 text-sm text-slate-600">
                Check type
                <select className={inputClass} value={newType} onChange={(e) => setNewType(e.target.value as CriterionType)}>
                  {TYPES.map(([type, t]) => (
                    <option key={type} value={type}>{t.label}</option>
                  ))}
                </select>
              </label>
              <button type="button" className={secondaryButton} onClick={() => setSelectedId(addCriterion(project.id, newType))}>
                + Add
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{CRITERION_TYPES[newType].help}</p>
          </Card>
        </div>

        {current && info ? (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit criterion</h2>
                <button type="button" className={dangerButton} onClick={() => remove(current.id, current.name)}>
                  Delete
                </button>
              </div>
              <label className="mb-4 block text-sm text-slate-600">
                Name shown in reports
                <input className={inputClass} value={current.name} onChange={(e) => updateCriterion(project.id, current.id, { name: e.target.value })} />
              </label>
              <label className="mb-1 block text-sm text-slate-600">
                Check type
                <select
                  className={inputClass}
                  value={current.type}
                  onChange={(e) => {
                    const type = e.target.value as CriterionType;
                    updateCriterion(project.id, current.id, { type, name: CRITERION_TYPES[type].label, details: CRITERION_TYPES[type].defaultDetails ?? "" });
                  }}
                >
                  {TYPES.map(([type, t]) => (
                    <option key={type} value={type}>{t.label}</option>
                  ))}
                </select>
              </label>
              <p className="mb-4 text-xs text-slate-500">{info.help}</p>
              {info.detailsLabel && (
                <label className="mb-4 block text-sm text-slate-600">
                  {info.detailsLabel}
                  <input
                    className={inputClass}
                    placeholder={info.placeholder}
                    value={current.details}
                    onChange={(e) => updateCriterion(project.id, current.id, { details: e.target.value })}
                  />
                </label>
              )}
              <label className="block text-sm text-slate-600">
                Weight (points)
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={current.weight}
                  onChange={(e) => updateCriterion(project.id, current.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">Pass = full points, Partial = half, Fail = 0.</p>
            </Card>
            <div className="mt-4 flex justify-end">
              <LinkButton href="/csv-import" text="Next: import submissions →" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
