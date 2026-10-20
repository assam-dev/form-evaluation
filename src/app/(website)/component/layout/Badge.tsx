const colors: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  indigo: "bg-indigo-100 text-indigo-800",
  gray: "bg-slate-100 text-slate-700",
};

export default function Badge({ text, color = "green" }: { text: string; color?: string }) {
  const classes = colors[color] || colors.green;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>{text}</span>;
}
