// Reads the facts of one public GitHub repository from the GitHub REST API.
// Scoring is done separately (see evaluate.ts) so a teacher can change the
// criteria later without auditing the repository again.
//
// Without a token GitHub allows 60 requests per hour per network.
// One audit uses 5 requests. With a personal access token the limit is 5000.

export type RepoRef = { owner: string; repo: string; url: string };

export type RepoFacts = {
  url: string;
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  archived: boolean;
  license: string | null;
  createdAt: string;
  pushedAt: string;
  commitCount: number;
  languages: { name: string; percent: number }[];
  rootFiles: { name: string; type: "file" | "dir" }[];
  readme: string | null; // README text (first 20,000 characters), null if missing
  auditedAt: string;
};

export class AuditError extends Error {
  code: "not-found" | "rate-limit" | "network" | "other";
  constructor(message: string, code: AuditError["code"]) {
    super(message);
    this.code = code;
  }
}

// Turns "https://github.com/user/repo.git", "github.com/user/repo/tree/main" etc.
// into { owner, repo }. Returns null if the text is not a GitHub repository link.
export function parseGithubUrl(text: string): RepoRef | null {
  const match = text
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)/i);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  if (!repo || repo === "." || repo === "..") return null;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

const API = "https://api.github.com";

function headers(token: string, accept = "application/vnd.github+json"): HeadersInit {
  const h: Record<string, string> = { Accept: accept };
  if (token.trim()) h.Authorization = `Bearer ${token.trim()}`;
  return h;
}

async function request(url: string, token: string, onRate: (left: number) => void, accept?: string) {
  let res: Response;
  try {
    res = await fetch(url, { headers: headers(token, accept) });
  } catch {
    throw new AuditError("Could not reach GitHub. Check your internet connection.", "network");
  }
  const left = res.headers.get("x-ratelimit-remaining");
  if (left !== null) onRate(Number(left));
  if ((res.status === 403 || res.status === 429) && left === "0") {
    throw new AuditError(
      "GitHub request limit reached. Wait up to an hour, or add a GitHub token (Batch Progress → GitHub settings).",
      "rate-limit",
    );
  }
  if (res.status === 401) throw new AuditError("The GitHub token is invalid or expired. Remove or replace it in GitHub settings.", "other");
  return res;
}

// Counts commits by asking for 1 commit per page and reading the last page number.
async function countCommits(base: string, token: string, onRate: (left: number) => void) {
  const res = await request(`${base}/commits?per_page=1`, token, onRate);
  if (res.status === 409) return 0; // empty repository
  if (!res.ok) return 0;
  const last = res.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
  if (last) return Number(last[1]);
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

export async function fetchRepoFacts(
  ref: RepoRef,
  token: string,
  onRate: (left: number) => void = () => {},
): Promise<RepoFacts> {
  const base = `${API}/repos/${ref.owner}/${ref.repo}`;

  const infoRes = await request(base, token, onRate);
  if (infoRes.status === 404) {
    throw new AuditError("Repository not found. It may be private, deleted, or the link is wrong.", "not-found");
  }
  if (!infoRes.ok) throw new AuditError(`GitHub returned an error (${infoRes.status}).`, "other");
  const info = await infoRes.json();

  const [langRes, contentsRes, readmeRes, commitCount] = await Promise.all([
    request(`${base}/languages`, token, onRate),
    request(`${base}/contents`, token, onRate),
    request(`${base}/readme`, token, onRate, "application/vnd.github.raw+json"),
    countCommits(base, token, onRate),
  ]);

  const langData: Record<string, number> = langRes.ok ? await langRes.json() : {};
  const contents = contentsRes.ok ? await contentsRes.json() : [];
  const readme = readmeRes.ok ? (await readmeRes.text()).slice(0, 20000) : null;

  const totalBytes = Object.values(langData).reduce((sum, n) => sum + n, 0);
  const languages = Object.entries(langData)
    .map(([name, bytes]) => ({ name, percent: totalBytes ? Math.round((bytes / totalBytes) * 1000) / 10 : 0 }))
    .sort((a, b) => b.percent - a.percent);

  const rootFiles: RepoFacts["rootFiles"] = Array.isArray(contents)
    ? contents.map((item: { name: string; type: string }) => ({
        name: item.name,
        type: item.type === "dir" ? "dir" : "file",
      }))
    : [];

  return {
    url: info.html_url || ref.url,
    owner: ref.owner,
    repo: ref.repo,
    fullName: info.full_name,
    description: info.description || "",
    defaultBranch: info.default_branch,
    stars: info.stargazers_count ?? 0,
    forks: info.forks_count ?? 0,
    openIssues: info.open_issues_count ?? 0,
    archived: Boolean(info.archived),
    license: info.license?.name ?? null,
    createdAt: info.created_at,
    pushedAt: info.pushed_at,
    commitCount,
    languages,
    rootFiles,
    readme,
    auditedAt: new Date().toISOString(),
  };
}

// Quick check used by the Drive Checker: does this public repository exist?
export async function checkRepoExists(ref: RepoRef, token: string): Promise<"public" | "missing" | "unknown"> {
  try {
    const res = await fetch(`${API}/repos/${ref.owner}/${ref.repo}`, { headers: headers(token) });
    if (res.ok) return "public";
    if (res.status === 404) return "missing";
    return "unknown";
  } catch {
    return "unknown";
  }
}
