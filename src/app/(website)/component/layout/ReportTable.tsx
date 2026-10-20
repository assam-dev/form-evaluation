import Card from "./Card";
import Badge from "./Badge";
import Link from "next/link";

export type ReportRow = {
  id: string;
  name: string;
  roll: string;
  percent: number | null;
  marks: number | null;
  totalMarks: number;
  status: string;
  statusColor: string;
};

export default function ReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="p-2">Student</th>
              <th className="p-2">Roll no.</th>
              <th className="p-2">Score</th>
              <th className="p-2">Marks</th>
              <th className="p-2">Status</th>
              <th className="p-2 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-2 font-medium">{r.name || "-"}</td>
                <td className="p-2">{r.roll || "-"}</td>
                <td className="p-2">{r.percent === null ? "-" : `${r.percent}%`}</td>
                <td className="p-2">{r.marks === null ? "-" : `${r.marks} / ${r.totalMarks}`}</td>
                <td className="p-2">
                  <Badge text={r.status} color={r.statusColor} />
                </td>
                <td className="p-2 print:hidden">
                  {r.percent !== null && (
                    <Link href={`/evaluation-reports/detail?id=${r.id}`} className="font-semibold text-[var(--colorPrimary)]">
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
