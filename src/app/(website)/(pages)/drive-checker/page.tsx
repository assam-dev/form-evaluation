"use client";

import { useState } from "react";
import Card from "@/src/app/(website)/component/layout/Card";
import Badge from "@/src/app/(website)/component/layout/Badge";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import { inputClass, primaryButton } from "@/src/app/(website)/component/layout/Field";
import { checkRepoExists, parseGithubUrl } from "@/src/app/(website)/lib/githubAudit";
import { getDB } from "@/src/app/(website)/lib/store";

type Check = { label: string; text: string; color: string };
type Result = { kind: string; checks: Check[]; note: string; openUrl: string };

const pass = (label: string, ok: boolean, okText = "Pass", failText = "Fail"): Check => ({ label, text: ok ? okText : failText, color: ok ? "green" : "red" });

// Google Drive file / folder links: /file/d/<id>, /drive/folders/<id>, open?id=<id>, docs.google.com/<type>/d/<id>
function driveId(url: URL) {
  return url.pathname.match(/\/(?:file\/d|folders|d)\/([A-Za-z0-9_-]{10,})/)?.[1] ?? url.searchParams.get("id") ?? "";
}

export default function DriveCheckerPage() {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function runCheck() {
    const text = link.trim();
    if (!text) return;
    let url: URL | null = null;
    try {
      url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    } catch {
      url = null;
    }
    const validFormat = /^https?:\/\//i.test(text) && url !== null;

    const repo = parseGithubUrl(text);
    if (repo) {
      setBusy(true);
      const state = await checkRepoExists(repo, getDB().githubToken);
      setBusy(false);
      setResult({
        kind: "GitHub repository",
        openUrl: repo.url,
        note: state === "unknown" ? "GitHub could not be reached (network or request limit). Try again later." : "",
        checks: [
          pass("Valid URL format", validFormat, "Pass", "Missing https://"),
          pass("GitHub link", true),
          { label: "Repository", text: `${repo.owner}/${repo.repo}`, color: "indigo" },
          state === "public"
            ? { label: "Public access", text: "Public", color: "green" }
            : state === "missing"
              ? { label: "Public access", text: "Not found or private", color: "red" }
              : { label: "Public access", text: "Unknown", color: "gray" },
        ],
      });
      return;
    }

    const host = url?.hostname.replace(/^www\./, "") ?? "";
    if (host === "drive.google.com" || host === "docs.google.com") {
      const id = url ? driveId(url) : "";
      const folder = url?.pathname.includes("/folders/");
      setResult({
        kind: folder ? "Google Drive folder" : "Google Drive file",
        openUrl: url!.toString(),
        note: "Browsers cannot test Drive sharing directly. Open the link in a private (incognito) window: if it asks you to sign in or request access, the student must set sharing to “Anyone with the link”.",
        checks: [
          pass("Valid URL format", validFormat, "Pass", "Missing https://"),
          pass("Google Drive link", true),
          pass("File ID detected", Boolean(id), id ? `${id.slice(0, 12)}…` : "Pass", "Fail"),
          { label: "Public access", text: "Check manually", color: "gray" },
        ],
      });
      return;
    }

    setResult({
      kind: "Unknown link",
      openUrl: url?.toString() ?? "",
      note: "Submissions should be a GitHub repository or a Google Drive link.",
      checks: [pass("Valid URL format", validFormat && Boolean(url?.hostname.includes("."))), pass("GitHub or Google Drive link", false)],
    });
  }

  return (
    <div>
      <PageTitle title="Drive Checker" subtitle="Check a submission link before running the audit." />
      <div className="max-w-2xl">
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runCheck();
            }}
          >
            <label className="mb-4 block text-sm text-slate-600">
              Google Drive or GitHub link
              <input
                className={inputClass}
                placeholder="https://github.com/user/repo or https://drive.google.com/file/d/..."
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <button type="submit" disabled={busy || !link.trim()} className={primaryButton}>
              {busy ? "Checking…" : "Check link"}
            </button>
          </form>
          {result && (
            <>
              <p className="mt-5 text-sm">
                Link type: <b>{result.kind}</b>
              </p>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {result.checks.map((c) => (
                  <li key={c.label} className="flex items-center justify-between py-2.5">
                    {c.label}
                    <Badge text={c.text} color={c.color} />
                  </li>
                ))}
              </ul>
              {result.note && <p className="mt-3 text-sm text-slate-500">{result.note}</p>}
              {result.openUrl && (
                <a href={result.openUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-[var(--colorPrimary)] underline">
                  Open link ↗
                </a>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
