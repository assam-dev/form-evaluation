import Card from "./Card";
import Badge from "./Badge";
import type { CsvData } from "../../lib/csv";
import { parseGithubUrl } from "../../lib/githubAudit";

// Shows what the system understood from the uploaded CSV:
// size of the file, column names and the first few rows.
export default function CsvPreview({
  fileName,
  csv,
  nameCol,
  rollCol,
  linkCol,
  maxRows = 5,
}: {
  fileName: string;
  csv: CsvData;
  nameCol: number;
  rollCol: number;
  linkCol: number;
  maxRows?: number;
}) {
  const shown = csv.rows.slice(0, maxRows);

  function linkBadge(value: string) {
    if (!value) return <Badge text="Missing" color="red" />;
    if (parseGithubUrl(value)) return <Badge text="GitHub repo" color="green" />;
    return <Badge text="Not GitHub" color="amber" />;
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">File understood</h2>
        <Badge text="CSV parsed" color="green" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">File</p>
          <p className="font-medium break-all">{fileName}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Submissions (rows)</p>
          <p className="font-medium">{csv.rows.length}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Columns</p>
          <p className="font-medium">{csv.headers.length}</p>
        </div>
      </div>

      <p className="mb-2 text-xs text-slate-500">Column names found</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {csv.headers.map((h, i) => (
          <Badge
            key={h + i}
            text={h || `(column ${i + 1})`}
            color={i === linkCol ? "green" : i === nameCol || i === rollCol ? "indigo" : "gray"}
          />
        ))}
      </div>

      <p className="mb-2 text-xs text-slate-500">
        First {shown.length} of {csv.rows.length} rows
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="p-2">Row</th>
              <th className="p-2">Student</th>
              <th className="p-2">Roll no.</th>
              <th className="p-2">Repository link</th>
              <th className="p-2">Check</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const link = linkCol >= 0 ? r[linkCol] : "";
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{nameCol >= 0 ? r[nameCol] : "-"}</td>
                  <td className="p-2">{rollCol >= 0 ? r[rollCol] : "-"}</td>
                  <td className="max-w-xs truncate p-2" title={link}>{link || "(empty)"}</td>
                  <td className="p-2">{linkBadge(link)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
