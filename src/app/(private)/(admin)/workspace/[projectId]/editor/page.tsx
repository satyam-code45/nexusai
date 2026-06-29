import MiddlePanel from "@/components/middlepanel/MiddlePanel";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { SourcesSidebar } from "@/components/editor/SourcesSidebar";
import RightPanel from "@/components/rightpanel/RightPanel";
import ChatBox from "@/components/chatbox/Chatbox";
import ChatToggleHandle from "@/components/chatbox/ChatToggleHandle";
import { SearchProjectModal } from "@/components/project/SearchProjectModal";
import AddSourceModalWrapper from "@/components/addSource/AddSourceModalWrapper";
import ViewReportModalWrapper from "@/components/leftpanel/ViewReportModalWrapper";
import MindMapModalWrapper from "@/components/leftpanel/MindMapModalWrapper";
import { getSession } from "@/lib/auth/getSession";
import { EditorCollabProvider } from "@/contexts/EditorCollabContext";

export default async function EditorPage({
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--l-bg)",
      }}
    >
      {/* EditorCollabProvider wraps everything so SourcesSidebar, MiddlePanel,
          and upload modals can all share the same WebsocketProvider reference */}
      <EditorCollabProvider>
        <EditorTopBar projectId={projectId} roomId={roomId} />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sources sidebar */}
          <SourcesSidebar
            projectId={projectId}
            userId={session?.user?.id ?? ""}
          />

          {/* Editor + Source viewer */}
          <section
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              background: "var(--l-bg)",
            }}
          >
            <MiddlePanel session={session} projectId={projectId} roomId={roomId} />
          </section>

          {/* AI Chat */}
          <RightPanel>
            <ChatBox userId={session?.user?.id} projectId={projectId} roomId={roomId} />
          </RightPanel>
          <ChatToggleHandle />
        </div>

        <AddSourceModalWrapper
          session={session}
          userId={session?.user?.id}
          projectId={projectId}
        />
        <SearchProjectModal />
        <ViewReportModalWrapper />
        <MindMapModalWrapper />
      </EditorCollabProvider>
    </div>
  );
}
