import Card from "./Card";
import Badge from "./Badge";

export default function CriteriaCard({
  name,
  status,
  detail,
  score,
  max,
  note,
}: {
  name: string;
  status: string;
  detail: string;
  score: number;
  max: number;
  note?: string;
}) {
  const color = status === "Pass" ? "green" : status === "Partial" ? "amber" : "red";
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{name}</h3>
        <Badge text={status} color={color} />
      </div>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
      <p className="mt-3 text-xs font-semibold text-slate-700">
        {score} / {max} points
      </p>
      {note && <p className="mt-1 text-xs font-semibold text-amber-700">{note}</p>}
    </Card>
  );
}
