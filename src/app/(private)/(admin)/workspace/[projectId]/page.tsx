import LefPanel from "@/components/leftpanel/LeftPanel";
import { SearchProjectModal } from "@/components/project/SearchProjectModal";
import { getSession } from "@/lib/auth/getSession";
import AddSourceModalWrapper from "@/components/addSource/AddSourceModalWrapper";
import ViewReportModalWrapper from "@/components/leftpanel/ViewReportModalWrapper";
import MindMapModalWrapper from "@/components/leftpanel/MindMapModalWrapper";
import WorkspaceDashboard from "@/components/workspace/WorkspaceDashboard";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ roomId?: string }>;
}) {
  const { projectId } = await params;
  const { roomId } = await searchParams;
  const session = await getSession();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <LefPanel userId={session?.user?.id} projectId={projectId} roomId={roomId} />

      <main className="flex flex-1 overflow-hidden">
        <WorkspaceDashboard
          userId={session?.user?.id ?? ""}
          projectId={projectId}
          roomId={roomId}
        />
      </main>

      <AddSourceModalWrapper
        session={session}
        userId={session?.user?.id}
        projectId={projectId}
      />
      <SearchProjectModal />
      <ViewReportModalWrapper />
      <MindMapModalWrapper />
    </div>
  );
}
