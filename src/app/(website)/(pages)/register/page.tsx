"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/src/app/(website)/component/layout/Card";
import PageTitle from "@/src/app/(website)/component/layout/PageTitle";
import Field, { primaryButton } from "@/src/app/(website)/component/layout/Field";
import { registerUser } from "@/src/app/(website)/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    const err = await registerUser(name, email, password);
    setBusy(false);
    if (err) setError(err);
    else router.push("/projects");
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle title="Register" subtitle="Create a teacher account." />
      <Card>
        <form onSubmit={handleSubmit}>
          <Field label="Full name" value={name} onChange={setName} required />
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required hint="At least 6 characters." />
          <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} required />
          {error && <p className="mb-4 text-sm font-semibold text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy ? "Creating account…" : "Create account"}
          </button>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-[var(--colorPrimary)] underline">Login</Link>
          </p>
        </form>
      </Card>
      <p className="mt-3 text-center text-xs text-slate-500">Accounts are stored only in this browser (no server).</p>
    </div>
  );
}
