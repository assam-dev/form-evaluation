import ProjectForm from "@/src/app/(website)/component/layout/ProjectForm";

// /projects/new creates a project, /projects/new?edit=<id> edits one.
export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  return <ProjectForm editId={edit ?? ""} />;
}
