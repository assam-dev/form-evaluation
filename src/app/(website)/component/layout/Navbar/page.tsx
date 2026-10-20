// File: Navbar/page.tsx located in app-name/src/app/(website)/component/layout/Navbar/

import Link from "next/link";
import AccountMenu from "../AccountMenu";

const links = [
  { href: "/projects", text: "Projects" },
  { href: "/criteria-builder", text: "Criteria Builder" },
  { href: "/csv-import", text: "Import" },
  { href: "/batch-progress", text: "Batch Progress" },
  { href: "/evaluation-reports/detail", text: "Submission Report" },
  { href: "/admin-review", text: "Review" },
  { href: "/evaluation-reports", text: "Final Report" },
];

const tools = [
  { href: "/pdf-analyzer", text: "PDF Analyzer" },
  { href: "/docx-analyzer", text: "DOCX Analyzer" },
  { href: "/excel-analyzer", text: "Excel Analyzer" },
  { href: "/drive-checker", text: "Drive Checker" },
];

// One hover dropdown. Opens on mouse hover, and on keyboard focus (Tab) too.
function Dropdown({ label, items }: { label: string; items: { href: string; text: string }[] }) {
  return (
    <div className="group relative">
      <button type="button" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm">
        {label}
        <span className="text-xs transition-transform group-hover:rotate-180">▾</span>
      </button>
      <div className="dropdown-menu absolute left-0 top-full z-50 hidden min-w-48 overflow-hidden rounded-lg py-1 shadow-lg group-hover:block group-focus-within:block">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="dropdown-link block px-4 py-2 text-sm">
            {item.text}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  return (
    <nav className="print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="logo-link mr-6 text-xl font-bold">Form Evaluation</Link>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm">{l.text}</Link>
        ))}
        <Dropdown label="Tools" items={tools} />
        <div className="ml-auto">
          <AccountMenu />
        </div>
      </div>
    </nav>
  );
}
