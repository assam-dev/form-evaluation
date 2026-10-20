// Turns the facts of a repository into marks, using the project's criteria.

import type { RepoFacts } from "./githubAudit";
import type { Criterion, CriterionType, Project, Submission } from "./store";

export type CheckStatus = "Pass" | "Partial" | "Fail";

type TypeInfo = {
  label: string;
  help: string;
  detailsLabel?: string; // when missing, this type has no settings
  placeholder?: string;
  defaultDetails?: string;
};

export const CRITERION_TYPES: Record<CriterionType, TypeInfo> = {
  readme: { label: "README file", help: "A README exists in the repository (300+ characters for full marks)." },
  readme_keywords: {
    label: "README keywords",
    help: "The README mentions every keyword.",
    detailsLabel: "Keywords (comma separated)",
    placeholder: "installation, usage, screenshots",
  },
  description: { label: "Repository description", help: "The About / description field on GitHub is filled in." },
  commits: {
    label: "Commit history",
    help: "Enough commits on the default branch. Half of the number gives partial marks.",
    detailsLabel: "Minimum commits",
    placeholder: "10",
    defaultDetails: "10",
  },
  deadline: { label: "Submitted before deadline", help: "Last push to the repository is on or before the project deadline." },
  activity: {
    label: "Recent activity",
    help: "Last push is within this many days of the audit. Double the days gives partial marks.",
    detailsLabel: "Days",
    placeholder: "90",
    defaultDetails: "90",
  },
  setup_file: { label: "Project setup file", help: "package.json, requirements.txt, pom.xml or a similar file is present." },
  structure: { label: "Folder structure", help: "Code is organised in folders such as src, app, lib, components." },
  required_files: {
    label: "Required files / folders",
    help: "Every listed file or folder exists in the root of the repository.",
    detailsLabel: "Names (comma separated)",
    placeholder: "README.md, src, package.json",
  },
  languages: {
    label: "Required languages",
    help: "GitHub detects every listed language in the code.",
    detailsLabel: "Languages (comma separated)",
    placeholder: "TypeScript, CSS",
  },
  gitignore: { label: ".gitignore", help: "A .gitignore exists and node_modules is not committed." },
  tests: { label: "Tests", help: "A tests folder or test configuration is present." },
  license: { label: "License", help: "The repository has a license." },
};

export const RECOMMENDED: { type: CriterionType; weight: number }[] = [
  { type: "readme", weight: 15 },
  { type: "commits", weight: 15 },
  { type: "deadline", weight: 10 },
  { type: "activity", weight: 10 },
  { type: "setup_file", weight: 10 },
  { type: "structure", weight: 10 },
  { type: "tests", weight: 10 },
  { type: "license", weight: 10 },
  { type: "description", weight: 5 },
  { type: "gitignore", weight: 5 },
];

export type CriterionResult = {
  criterion: Criterion;
  status: CheckStatus;
  detail: string;
  aiScore: number;
  finalScore: number;
  overridden: boolean;
};

const DAY = 1000 * 60 * 60 * 24;

function list(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Checks one list (keywords, files, languages) and returns Pass / Partial / Fail.
function checkList(wanted: string[], isFound: (item: string) => boolean, what: string): [CheckStatus, string] {
  const missing = wanted.filter((w) => !isFound(w));
  const found = wanted.length - missing.length;
  if (missing.length === 0) return ["Pass", `All ${plural(wanted.length, what)} found: ${wanted.join(", ")}.`];
  if (found > 0) return ["Partial", `${found} of ${wanted.length} found. Missing: ${missing.join(", ")}.`];
  return ["Fail", `None found. Missing: ${missing.join(", ")}.`];
}

function check(c: Criterion, f: RepoFacts, project: Project): [CheckStatus, string] {
  const names = f.rootFiles.map((x) => x.name.toLowerCase());
  const dirs = f.rootFiles.filter((x) => x.type === "dir").map((x) => x.name.toLowerCase());

  switch (c.type) {
    case "readme": {
      if (f.readme === null) return ["Fail", "No README in the repository."];
      if (f.readme.trim().length < 300) return ["Partial", `README is very short (${f.readme.trim().length} characters).`];
      return ["Pass", `README found (${f.readme.length.toLocaleString()} characters).`];
    }
    case "readme_keywords": {
      const words = list(c.details);
      if (words.length === 0) return ["Fail", "No keywords are set for this criterion."];
      if (f.readme === null) return ["Fail", "No README, so no keywords could be found."];
      const text = f.readme.toLowerCase();
      return checkList(words, (w) => text.includes(w.toLowerCase()), "keyword");
    }
    case "description":
      return f.description.trim() ? ["Pass", `"${f.description}"`] : ["Fail", "The About / description field is empty."];
    case "commits": {
      const min = Math.max(1, parseInt(c.details) || 10);
      const text = `${plural(f.commitCount, "commit")} (${min} expected).`;
      if (f.commitCount >= min) return ["Pass", text];
      if (f.commitCount >= Math.ceil(min / 2)) return ["Partial", text];
      return ["Fail", text];
    }
    case "deadline": {
      if (!project.deadline) return ["Pass", "The project has no deadline, so this is not checked."];
      const end = new Date(`${project.deadline}T23:59:59`).getTime();
      const pushed = new Date(f.pushedAt).getTime();
      if (pushed <= end) return ["Pass", `Last push was before the deadline (${project.deadline}).`];
      const late = Math.ceil((pushed - end) / DAY);
      return ["Fail", `Last push was ${plural(late, "day")} after the deadline (${project.deadline}).`];
    }
    case "activity": {
      const days = Math.max(1, parseInt(c.details) || 90);
      const age = Math.floor((new Date(f.auditedAt).getTime() - new Date(f.pushedAt).getTime()) / DAY);
      const text = `Last push ${plural(age, "day")} before the audit (${days} allowed).`;
      if (age <= days) return ["Pass", text];
      if (age <= days * 2) return ["Partial", text];
      return ["Fail", text];
    }
    case "setup_file": {
      const manifests = ["package.json", "requirements.txt", "pyproject.toml", "pom.xml", "build.gradle", "build.gradle.kts", "composer.json", "go.mod", "cargo.toml", "gemfile", "pubspec.yaml", "cmakelists.txt", "makefile"];
      const found = f.rootFiles.find((x) => manifests.includes(x.name.toLowerCase()) || /\.(csproj|sln)$/i.test(x.name));
      return found ? ["Pass", `${found.name} found.`] : ["Fail", "No package.json, requirements.txt, pom.xml or similar file in the root."];
    }
    case "structure": {
      const codeDirs = ["src", "app", "lib", "components", "pages", "public", "api", "server", "client", "backend", "frontend", "include", "assets", "static", "templates", "views", "models", "controllers"];
      const good = dirs.filter((d) => codeDirs.includes(d));
      if (good.length >= 2) return ["Pass", `Organised folders: ${good.join(", ")}.`];
      if (dirs.length > 0) return ["Partial", `Folders in root: ${dirs.join(", ")}.`];
      return ["Fail", "All files are in the root folder, there are no sub folders."];
    }
    case "required_files": {
      const wanted = list(c.details);
      if (wanted.length === 0) return ["Fail", "No file or folder names are set for this criterion."];
      return checkList(wanted, (w) => names.includes(w.toLowerCase().replace(/\/$/, "")), "item");
    }
    case "languages": {
      const wanted = list(c.details);
      const langs = f.languages.map((l) => l.name.toLowerCase());
      if (wanted.length === 0) {
        return langs.length ? ["Pass", `Languages: ${f.languages.map((l) => l.name).join(", ")}.`] : ["Fail", "No code detected."];
      }
      return checkList(wanted, (w) => langs.includes(w.toLowerCase()), "language");
    }
    case "gitignore": {
      const has = names.includes(".gitignore");
      if (dirs.includes("node_modules")) return ["Partial", "node_modules folder was committed to the repository."];
      return has ? ["Pass", ".gitignore file found."] : ["Fail", "No .gitignore file."];
    }
    case "tests": {
      const found =
        dirs.some((d) => ["test", "tests", "__tests__", "spec", "specs", "e2e", "cypress"].includes(d)) ||
        names.some((n) => /^(jest|vitest|playwright|cypress|karma)\.config\./.test(n) || n === "pytest.ini");
      return found ? ["Pass", "Test folder or test configuration found."] : ["Fail", "No tests folder or test configuration in the root."];
    }
    case "license": {
      const file = names.some((n) => n.startsWith("license") || n.startsWith("licence"));
      if (f.license && f.license !== "Other") return ["Pass", `${f.license}.`];
      return file ? ["Pass", "License file found."] : ["Fail", "No license."];
    }
  }
}

const FACTOR: Record<CheckStatus, number> = { Pass: 1, Partial: 0.5, Fail: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function evaluate(facts: RepoFacts, project: Project, overrides: Record<string, number> = {}): CriterionResult[] {
  return project.criteria.map((criterion) => {
    const [status, detail] = check(criterion, facts, project);
    const aiScore = round1(criterion.weight * FACTOR[status]);
    const has = typeof overrides[criterion.id] === "number";
    return {
      criterion,
      status,
      detail,
      aiScore,
      finalScore: has ? overrides[criterion.id] : aiScore,
      overridden: has && overrides[criterion.id] !== aiScore,
    };
  });
}

export type Score = {
  results: CriterionResult[];
  maxPoints: number;
  aiPoints: number;
  finalPoints: number;
  aiPercent: number;
  finalPercent: number;
  marks: number;
  totalMarks: number;
};

// Score of one audited submission. Returns null if it has not been audited yet.
export function scoreSubmission(sub: Submission, project: Project | undefined): Score | null {
  if (!sub.facts || !project) return null;
  const results = evaluate(sub.facts, project, sub.overrides);
  const maxPoints = round1(results.reduce((s, r) => s + r.criterion.weight, 0));
  const aiPoints = round1(results.reduce((s, r) => s + r.aiScore, 0));
  const finalPoints = round1(results.reduce((s, r) => s + r.finalScore, 0));
  const aiPercent = maxPoints ? Math.round((aiPoints / maxPoints) * 100) : 0;
  const finalPercent = maxPoints ? Math.round((finalPoints / maxPoints) * 100) : 0;
  const marks = maxPoints ? round1((finalPoints / maxPoints) * project.totalMarks) : 0;
  return { results, maxPoints, aiPoints, finalPoints, aiPercent, finalPercent, marks, totalMarks: project.totalMarks };
}

export function gradeOf(percent: number): { text: string; color: string } {
  if (percent >= 80) return { text: "Good", color: "green" };
  if (percent >= 50) return { text: "Needs improvement", color: "amber" };
  return { text: "Weak", color: "red" };
}
