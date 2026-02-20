import { SearchProjectView } from "@/components/search/SearchProjectView";

export default async function SearchProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <SearchProjectView projectId={projectId} />;
}
