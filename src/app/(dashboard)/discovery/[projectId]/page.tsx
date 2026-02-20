import { DiscoveryProjectView } from "@/components/discovery/DiscoveryProjectView";

export default async function DiscoveryProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <DiscoveryProjectView projectId={projectId} />;
}
