import type { ReactNode } from "react";

export default function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>;
}
