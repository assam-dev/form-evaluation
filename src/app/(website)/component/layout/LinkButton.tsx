import Link from "next/link";

export default function LinkButton({ href, text, outline = false }: { href: string; text: string; outline?: boolean }) {
  const style = outline
    ? "border border-[var(--colorPrimary)] bg-white text-[var(--colorPrimary)] hover:bg-[var(--colorPrimaryLight)]"
    : "bg-[var(--colorPrimary)] text-white hover:bg-[var(--colorPrimarySecondary)]";
  return (
    <Link href={href} className={`inline-block rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${style}`}>
      {text}
    </Link>
  );
}
