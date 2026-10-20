import SubmissionReport from "@/src/app/(website)/component/layout/SubmissionReport";

// /evaluation-reports/detail?id=<submission id>
export default async function SubmissionReportPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <SubmissionReport id={id ?? ""} />;
}
