"use client";

import { useState } from "react";
import Card from "./Card";
import { inputClass, primaryButton } from "./Field";
import { setGithubToken, useDB } from "../../lib/store";

// Optional GitHub token. Without it GitHub allows 60 requests per hour (12 audits).
export default function GithubSettings() {
  const db = useDB();
  const [token, setToken] = useState<string | null>(null);
  const value = token ?? db.githubToken;
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">
          <span>GitHub settings</span>
          <span className="text-xs font-normal text-slate-500">
            {db.githubToken ? "Token saved" : "No token (60 requests / hour)"}
            {db.rateLimitRemaining !== null && ` · ${db.rateLimitRemaining} requests left`}
          </span>
        </summary>
        <p className="mt-3 text-sm text-slate-500">
          Each audit uses 5 GitHub requests. Add a personal access token (GitHub → Settings → Developer settings → Tokens, no
          scopes needed) to raise the limit to 5,000 requests per hour. The token is stored only in this browser.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm text-slate-600">
            Personal access token
            <input
              type="password"
              className={inputClass}
              placeholder="ghp_..."
              value={value}
              onChange={(e) => {
                setToken(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              setGithubToken(value);
              setSaved(true);
            }}
          >
            Save token
          </button>
        </div>
        {saved && <p className="mt-2 text-sm text-emerald-700">{value ? "Token saved." : "Token removed."}</p>}
      </details>
    </Card>
  );
}
