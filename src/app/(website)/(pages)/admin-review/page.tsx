import AdminReview from "@/src/app/(website)/component/layout/AdminReview";

// /admin-review?id=<submission id>
export default async function AdminReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <AdminReview id={id ?? ""} />;
}
