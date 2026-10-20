import Card from "./Card";

// A card with a title and label / value rows (used by the analyzer pages).
export default function InfoList({ title, items }: { title: string; items: { label: string; value: string | number }[] }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {items.map((r) => (
          <li key={r.label} className="flex justify-between gap-4 py-2.5">
            <span className="text-slate-500">{r.label}</span>
            <span className="text-right font-medium break-all">{r.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
