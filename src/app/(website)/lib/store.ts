// All records of the app (projects, criteria, submissions, users) are kept in the
// browser's localStorage, so they stay after a page refresh. There is no backend.
// Components read the data with useDB() and change it with the functions below;
// every change re-renders the pages that use it.

import { useSyncExternalStore } from "react";
import { AuditError, fetchRepoFacts, parseGithubUrl, type RepoFacts } from "./githubAudit";
import { CRITERION_TYPES, RECOMMENDED, scoreSubmission } from "./evaluate";

/* ---------------------------------- Types --------------------------------- */

export type CriterionType =
  | "readme"
  | "readme_keywords"
  | "description"
  | "commits"
  | "deadline"
  | "activity"
  | "setup_file"
  | "structure"
  | "required_files"
  | "languages"
  | "gitignore"
  | "tests"
  | "license";

export type Criterion = { id: string; type: CriterionType; name: string; details: string; weight: number };

export type Project = {
  id: string;
  name: string;
  description: string;
  deadline: string; // yyyy-mm-dd or ""
  totalMarks: number;
  createdAt: string;
  criteria: Criterion[];
};

export type SubmissionStatus = "queued" | "running" | "done" | "failed" | "attention";

export type Submission = {
  id: string;
  projectId: string;
  studentName: string;
  roll: string;
  email: string;
  repoUrl: string;
  csvRow: number;
  importedAt: string;
  status: SubmissionStatus;
  error: string;
  facts: RepoFacts | null;
  history: { date: string; percent: number }[];
  overrides: Record<string, number>; // criterion id -> points given by the teacher
  comment: string;
  reviewed: boolean;
  reviewedAt: string;
};

export type User = { id: string; name: string; email: string; passwordHash: string; createdAt: string };

export type DB = {
  ready: boolean; // false while rendering on the server, true once localStorage is read
  projects: Project[];
  submissions: Submission[];
  users: User[];
  sessionUserId: string | null;
  activeProjectId: string | null;
  githubToken: string;
  rateLimitRemaining: number | null;
  batchRunning: boolean;
};

export const STATUS_INFO: Record<SubmissionStatus, { text: string; color: string }> = {
  queued: { text: "Queued", color: "gray" },
  running: { text: "Auditing", color: "indigo" },
  done: { text: "Audited", color: "green" },
  failed: { text: "Failed", color: "red" },
  attention: { text: "Needs attention", color: "amber" },
};

/* ---------------------------------- Store --------------------------------- */

const KEY = "auditlens-data-v1";

const EMPTY: DB = {
  ready: true,
  projects: [],
  submissions: [],
  users: [],
  sessionUserId: null,
  activeProjectId: null,
  githubToken: "",
  rateLimitRemaining: null,
  batchRunning: false,
};
const SERVER_SNAPSHOT: DB = { ...EMPTY, ready: false };

let cache: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    const db: DB = { ...EMPTY, ...saved, ready: true, batchRunning: false };
    // An audit that was running when the page closed goes back to the queue.
    db.submissions = (db.submissions || []).map((s) => (s.status === "running" ? { ...s, status: "queued" } : s));
    return db;
  } catch {
    return { ...EMPTY };
  }
}

function getSnapshot(): DB {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (!cache) cache = load();
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep several open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(change: (db: DB) => DB) {
  const next = change(getSnapshot());
  cache = next;
  try {
    const persist: Partial<DB> = { ...next };
    delete persist.ready;
    delete persist.batchRunning;
    window.localStorage.setItem(KEY, JSON.stringify(persist));
  } catch (err) {
    console.error("Could not save data to localStorage", err);
  }
  listeners.forEach((l) => l());
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

export function getDB(): DB {
  return getSnapshot();
}

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* -------------------------------- Projects -------------------------------- */

// The project chosen in the project picker (or the newest one).
export function activeProjectOf(db: DB): Project | null {
  return db.projects.find((p) => p.id === db.activeProjectId) ?? db.projects[db.projects.length - 1] ?? null;
}

export function setActiveProject(id: string) {
  update((db) => ({ ...db, activeProjectId: id }));
}

export function createProject(data: Omit<Project, "id" | "createdAt" | "criteria">): string {
  const project: Project = { ...data, id: newId(), createdAt: new Date().toISOString(), criteria: [] };
  update((db) => ({ ...db, projects: [...db.projects, project], activeProjectId: project.id }));
  return project.id;
}

export function updateProject(id: string, patch: Partial<Omit<Project, "id">>) {
  update((db) => ({ ...db, projects: db.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
}

export function deleteProject(id: string) {
  update((db) => ({
    ...db,
    projects: db.projects.filter((p) => p.id !== id),
    submissions: db.submissions.filter((s) => s.projectId !== id),
    activeProjectId: db.activeProjectId === id ? null : db.activeProjectId,
  }));
}

export type ProjectStats = Record<SubmissionStatus, number> & { total: number; reviewed: number; average: number | null };

export function projectStats(db: DB, projectId: string): ProjectStats {
  const project = db.projects.find((p) => p.id === projectId);
  const subs = db.submissions.filter((s) => s.projectId === projectId);
  const stats: ProjectStats = { total: subs.length, queued: 0, running: 0, done: 0, failed: 0, attention: 0, reviewed: 0, average: null };
  const percents: number[] = [];
  subs.forEach((s) => {
    stats[s.status]++;
    if (s.reviewed) stats.reviewed++;
    const score = scoreSubmission(s, project);
    if (score && score.maxPoints > 0) percents.push(score.finalPercent);
  });
  if (percents.length) stats.average = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
  return stats;
}

/* -------------------------------- Criteria -------------------------------- */

function setCriteria(projectId: string, change: (list: Criterion[]) => Criterion[]) {
  update((db) => ({
    ...db,
    projects: db.projects.map((p) => (p.id === projectId ? { ...p, criteria: change(p.criteria) } : p)),
  }));
}

export function makeCriterion(type: CriterionType, weight = 10): Criterion {
  const info = CRITERION_TYPES[type];
  return { id: newId(), type, name: info.label, details: info.defaultDetails ?? "", weight };
}

export function addCriterion(projectId: string, type: CriterionType): string {
  const c = makeCriterion(type);
  setCriteria(projectId, (list) => [...list, c]);
  return c.id;
}

export function addRecommendedCriteria(projectId: string) {
  setCriteria(projectId, (list) => [...list, ...RECOMMENDED.map((r) => makeCriterion(r.type, r.weight))]);
}

export function updateCriterion(projectId: string, id: string, patch: Partial<Omit<Criterion, "id">>) {
  setCriteria(projectId, (list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

export function deleteCriterion(projectId: string, id: string) {
  setCriteria(projectId, (list) => list.filter((c) => c.id !== id));
}

/* ------------------------------- Submissions ------------------------------ */

export type ImportRow = { studentName: string; roll: string; email: string; repoUrl: string; csvRow: number };

function linkProblem(repoUrl: string) {
  if (!repoUrl.trim()) return "No repository link in the CSV.";
  if (!parseGithubUrl(repoUrl)) return "The link is not a GitHub repository.";
  return "";
}

// Adds the CSV rows to a project. A student who is already in the project
// (same roll number, or same email, or same repository) is updated instead of added twice.
export function importSubmissions(projectId: string, rows: ImportRow[]) {
  const result = { added: 0, updated: 0, ids: [] as string[] };
  update((db) => {
    const subs = [...db.submissions];
    rows.forEach((row) => {
      const key = (s: { roll: string; email: string; repoUrl: string }) =>
        s.roll ? `r:${s.roll.toLowerCase()}` : s.email ? `e:${s.email.toLowerCase()}` : `u:${s.repoUrl.toLowerCase()}`;
      const index = subs.findIndex((s) => s.projectId === projectId && key(s) === key(row));
      const problem = linkProblem(row.repoUrl);
      const fresh = {
        ...row,
        status: (problem ? "attention" : "queued") as SubmissionStatus,
        error: problem,
        importedAt: new Date().toISOString(),
        overrides: {},
        comment: "",
        reviewed: false,
        reviewedAt: "",
      };
      if (index >= 0) {
        subs[index] = { ...subs[index], ...fresh };
        result.updated++;
        result.ids.push(subs[index].id);
      } else {
        const sub: Submission = { ...fresh, id: newId(), projectId, facts: null, history: [] };
        subs.push(sub);
        result.added++;
        result.ids.push(sub.id);
      }
    });
    return { ...db, submissions: subs };
  });
  return result;
}

export function updateSubmission(id: string, patch: Partial<Omit<Submission, "id">>) {
  update((db) => ({ ...db, submissions: db.submissions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
}

export function deleteSubmission(id: string) {
  update((db) => ({ ...db, submissions: db.submissions.filter((s) => s.id !== id) }));
}

export function saveReview(id: string, overrides: Record<string, number>, comment: string) {
  updateSubmission(id, { overrides, comment, reviewed: true, reviewedAt: new Date().toISOString() });
}

/* --------------------------------- Audits --------------------------------- */

export function setGithubToken(token: string) {
  update((db) => ({ ...db, githubToken: token.trim() }));
}

function setRate(left: number) {
  if (getDB().rateLimitRemaining !== left) update((db) => ({ ...db, rateLimitRemaining: left }));
}

// Audits one submission. Re-auditing replaces the old result and clears the teacher review.
export async function runAudit(id: string): Promise<"ok" | "failed" | "rate-limit"> {
  const sub = getDB().submissions.find((s) => s.id === id);
  if (!sub) return "failed";
  const ref = parseGithubUrl(sub.repoUrl);
  if (!ref) {
    updateSubmission(id, { status: "attention", error: linkProblem(sub.repoUrl) });
    return "failed";
  }

  updateSubmission(id, { status: "running", error: "" });
  try {
    const facts = await fetchRepoFacts(ref, getDB().githubToken, setRate);
    const current = getDB().submissions.find((s) => s.id === id);
    if (!current) return "failed"; // deleted while auditing
    const project = getDB().projects.find((p) => p.id === current.projectId);
    const score = scoreSubmission({ ...current, facts, overrides: {} }, project);
    updateSubmission(id, {
      status: "done",
      error: "",
      facts,
      overrides: {},
      comment: "",
      reviewed: false,
      reviewedAt: "",
      history: [...current.history, { date: facts.auditedAt, percent: score?.aiPercent ?? 0 }],
    });
    return "ok";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed.";
    updateSubmission(id, { status: "failed", error: message });
    return err instanceof AuditError && err.code === "rate-limit" ? "rate-limit" : "failed";
  }
}

let stopRequested = false;

// Audits the queued submissions of a project one after another.
export async function runQueue(projectId: string, includeFailed: boolean) {
  if (getDB().batchRunning) return;
  stopRequested = false;
  update((db) => ({ ...db, batchRunning: true }));
  const tried = new Set<string>();
  try {
    while (!stopRequested) {
      const next = getDB().submissions.find(
        (s) => s.projectId === projectId && !tried.has(s.id) && (s.status === "queued" || (includeFailed && s.status === "failed")),
      );
      if (!next) break;
      tried.add(next.id);
      if ((await runAudit(next.id)) === "rate-limit") break;
    }
  } finally {
    update((db) => ({ ...db, batchRunning: false }));
  }
}

export function stopQueue() {
  stopRequested = true;
}

/* ---------------------------------- Users --------------------------------- */

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`auditlens:${password}`);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // crypto.subtle only exists on https / localhost; simple fallback otherwise.
  let h = 5381;
  data.forEach((b) => (h = ((h << 5) + h + b) | 0));
  return `x${(h >>> 0).toString(16)}`;
}

export function currentUser(db: DB): User | null {
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}

// Returns an error message, or null when the account was created (and logged in).
export async function registerUser(name: string, email: string, password: string): Promise<string | null> {
  const mail = email.trim().toLowerCase();
  if (getDB().users.some((u) => u.email === mail)) return "An account with this email already exists.";
  const user: User = { id: newId(), name: name.trim(), email: mail, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
  update((db) => ({ ...db, users: [...db.users, user], sessionUserId: user.id }));
  return null;
}

export async function loginUser(email: string, password: string): Promise<string | null> {
  const user = getDB().users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || user.passwordHash !== (await hashPassword(password))) return "Wrong email or password.";
  update((db) => ({ ...db, sessionUserId: user.id }));
  return null;
}

export function logoutUser() {
  update((db) => ({ ...db, sessionUserId: null }));
}

/* ------------------------------ Backup / reset ---------------------------- */

export function exportAllData(): string {
  const data: Partial<DB> = { ...getDB() };
  delete data.ready;
  delete data.batchRunning;
  return JSON.stringify(data, null, 2);
}

export function clearAllData() {
  update(() => ({ ...EMPTY }));
}
