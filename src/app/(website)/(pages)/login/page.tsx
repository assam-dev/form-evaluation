"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/src/app/(website)/component/layout/Card";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import PageLoading from "@/src/app/(website)/component/layout/PageLoading";
import Field, { primaryButton, secondaryButton } from "@/src/app/(website)/component/layout/Field";
import { currentUser, loginUser, logoutUser, useDB } from "@/src/app/(website)/lib/store";

export default function LoginPage() {
  const db = useDB();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!db.ready) return <PageLoading />;
  const user = currentUser(db);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await loginUser(email, password);
    setBusy(false);
    if (err) setError(err);
    else router.push("/projects");
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle title="Login" subtitle="Sign in to the evaluation platform." />
      <Card>
        {user ? (
          <div>
            <p className="text-sm">
              You are logged in as <b>{user.name}</b> ({user.email}).
            </p>
            <div className="mt-4 flex gap-3">
              <button type="button" className={primaryButton} onClick={() => router.push("/projects")}>Go to projects</button>
              <button type="button" className={secondaryButton} onClick={logoutUser}>Logout</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Password" type="password" value={password} onChange={setPassword} required />
            {error && <p className="mb-4 text-sm font-semibold text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
              {busy ? "Signing in…" : "Login"}
            </button>
            <p className="mt-4 text-center text-sm text-slate-500">
              No account?{" "}
              <Link href="/register" className="font-semibold text-[var(--colorPrimary)] underline">Register</Link>
            </p>
          </form>
        )}
      </Card>
      <p className="mt-3 text-center text-xs text-slate-500">Accounts are stored only in this browser (no server).</p>
    </div>
  );
}
