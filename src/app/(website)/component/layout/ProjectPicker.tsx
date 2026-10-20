"use client";

import Link from "next/link";
import { activeProjectOf, setActiveProject, useDB } from "../../lib/store";
import { inputClass } from "./Field";

// Dropdown to choose which project a page works on. The choice is remembered.
export default function ProjectPicker() {
  const db = useDB();
  const active = activeProjectOf(db);
  if (db.projects.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <label className="w-full max-w-sm text-sm text-slate-600">
        Project
        <select className={inputClass} value={active?.id ?? ""} onChange={(e) => setActiveProject(e.target.value)}>
          {db.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <Link href="/projects/new" className="pb-2.5 text-sm font-semibold text-[var(--colorPrimary)] underline">
        + New project
      </Link>
    </div>
  );
}
