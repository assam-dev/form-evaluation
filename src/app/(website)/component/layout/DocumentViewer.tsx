import Card from "./Card";
import Badge from "./Badge";

type Section = { heading: string; found: boolean; where: string };

export default function DocumentViewer({ title, sections }: { title: string; sections: Section[] }) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 divide-y divide-slate-100">
        {sections.map((s) => (
          <li key={s.heading} className="flex items-center justify-between py-2.5 text-sm">
            <span>{s.heading}</span>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              {s.where}
              <Badge text={s.found ? "Found" : "Missing"} color={s.found ? "green" : "red"} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
