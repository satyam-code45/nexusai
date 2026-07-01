"use client";

import { useEffect, useCallback, Suspense, Fragment } from "react";
import dynamic from "next/dynamic";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { viewPdf as setViewPdf, setViewSourceType, fetchDocs } from "@/store/docSlice";
import Editor from "../editor/Editor";
import { DocUrlSync } from "./DocUrlSync";
import { UserMouse } from "@/components/collaboration/UserMouse";
import { BlinkingCursor } from "@/components/collaboration/BlinkingCursor";
import { Session } from "next-auth";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useEditorCollab } from "@/contexts/EditorCollabContext";
import { useState } from "react";

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted-foreground">Initializing Viewer…</p>,
});

export default function MiddlePanel({
  session,
  projectId,
  roomId,
}: {
  session: Session | null;
  projectId: string;
  roomId?: string;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const { viewPdf, viewSourceType, docs } = useSelector((state: RootState) => state.doc);
  const { activeRoom } = useSelector((state: RootState) => state.room);
  const { cursor } = useSelector((state: RootState) => state.aiEditor);

  // ── Room key ──────────────────────────────────────────────────────────────
  const effectiveRoomId = activeRoom?.roomId || roomId || null;
  const editorKey = effectiveRoomId ?? projectId;
  const roomKey   = effectiveRoomId ?? null;

  // ── Room role ─────────────────────────────────────────────────────────────
  const [roomRole, setRoomRole] = useState<"owner" | "editor" | "viewer" | null>(null);

  useEffect(() => {
    if (!effectiveRoomId) { setRoomRole(null); return; }
    (async () => {
      try {
        const r = await fetch(`/api/rooms/${encodeURIComponent(effectiveRoomId)}`);
        setRoomRole(r.ok ? ((await r.json()).room?.role ?? "editor") : "viewer");
      } catch {
        setRoomRole("viewer");
      }
    })();
  }, [effectiveRoomId]);

  // ── Docs for PDF picker ───────────────────────────────────────────────────
  useEffect(() => {
    const userId = session?.user?.id;
    if (projectId && userId) dispatch(fetchDocs({ projectId, userId, roomId: effectiveRoomId ?? undefined }));
  }, [projectId, session?.user?.id, effectiveRoomId]);

  // ── Clear viewed source on project switch ─────────────────────────────────
  useEffect(() => {
    dispatch(setViewPdf(null));
    dispatch(setViewSourceType(null));
    sessionStorage.removeItem("nexusai_viewPdf");
    sessionStorage.removeItem("nexusai_viewSourceType");
  }, [projectId]);

  // ── Collaboration session (replaces all manual WS/ydoc/provider setup) ────
  const { session: collabSession, wsStatus, initialContent, joinees, broadcastMouse } =
    useCollaboration(editorKey, projectId, {
      name:   session?.user?.name,
      email:  session?.user?.email,
      userId: session?.user?.id,
    });

  // Share the provider with siblings (SourcesSidebar, upload modals) via context
  const { registerProvider, peerTriggeredViewRef } = useEditorCollab();
  useEffect(() => {
    registerProvider(collabSession?.provider ?? null);
    return () => registerProvider(null);
  }, [collabSession?.provider, registerProvider]);

  // Broadcast viewPdf changes to peers — catches every dispatch path (PDFPicker,
  // SourcesSidebar, WorkspaceDashboard). peerTriggeredViewRef prevents echo loops.
  useEffect(() => {
    if (!collabSession?.provider || !viewPdf) return;
    if (peerTriggeredViewRef.current) { peerTriggeredViewRef.current = false; return; }
    collabSession.provider.awareness.setLocalStateField("viewingSource", {
      fileUrl: viewPdf,
      sourceType: viewSourceType ?? null,
    });
  }, [viewPdf, viewSourceType, collabSession?.provider]);

  // Broadcast cursor via awareness
  useEffect(() => {
    collabSession?.provider.awareness.setLocalStateField("appCursor", cursor);
  }, [cursor.x, cursor.y, collabSession]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    broadcastMouse(e.clientX, e.clientY);
  }, [broadcastMouse]);

  // ── Editor slot ───────────────────────────────────────────────────────────
  const editorSlot = (
    <div onMouseMove={onMouseMove} className="relative h-full w-full">
      {/* Collaborator cursors + mice */}
      {joinees.map((joinee) => {
        if (!joinee.user || joinee.user.userId === session?.user?.id) return null;
        return (
          <Fragment key={joinee.clientId}>
            {joinee.appCursor && (
              <BlinkingCursor
                x={`${joinee.appCursor.x}px`}
                y={`${joinee.appCursor.y}px`}
                name={joinee.user.name || "Anonymous"}
                color={joinee.user.color}
              />
            )}
            {joinee.appMouse && (
              <UserMouse
                mousePosition={joinee.appMouse}
                name={joinee.user.name || "Anonymous"}
                color={joinee.user.color}
              />
            )}
          </Fragment>
        );
      })}

      {collabSession ? (
        <Editor
          // sessionId changes each time a new ydoc+provider pair is created,
          // forcing a full remount so TipTap re-initializes from the new ydoc.
          key={`${editorKey}-${collabSession.sessionId}`}
          ydoc={collabSession.ydoc}
          provider={collabSession.provider}
          initialHtml={initialContent.html}
          initialTiptapJson={initialContent.tiptapJson}
          initialTitle={initialContent.title}
          projectId={projectId}
          workspaceKey={editorKey}
          readOnly={roomRole === "viewer"}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {wsStatus === "fetching" ? "Loading…" : "Connecting…"}
        </div>
      )}
    </div>
  );

  // ── PDF proxy routing ─────────────────────────────────────────────────────
  const needsProxy = viewPdf?.startsWith("https://res.cloudinary.com/") &&
    (!viewSourceType || ["pdf", "doc", "docx", "pptx", "ppt", "ppsx", "pptm"].includes(viewSourceType.toLowerCase()));

  const sourceUrl = viewPdf
    ? needsProxy
      ? `/api/pdf-proxy?url=${encodeURIComponent(viewPdf)}`
      : viewPdf.startsWith("http") || viewPdf.startsWith("/")
        ? viewPdf
        : `${process.env.NEXT_PUBLIC_APP_URL}/uploads/${viewPdf}`
    : undefined;

  const sourceTitle = viewPdf
    ? (docs as any[]).find((d) => d.fileUrl === viewPdf)?.title
      || decodeURIComponent(viewPdf.split("/").pop()?.split("?")[0] ?? "") || "Document"
    : "Document";

  return (
    <div className="flex h-full w-full">
      <Suspense fallback={null}>
        <DocUrlSync />
      </Suspense>
      <PDFViewer
        url={sourceUrl}
        title={sourceTitle}
        sourceType={viewSourceType ?? undefined}
        editorSlot={editorSlot}
        onPdfError={() => {
          sessionStorage.removeItem("nexusai_viewPdf");
          sessionStorage.removeItem("nexusai_viewSourceType");
          dispatch(setViewPdf(null));
          dispatch(setViewSourceType(null));
        }}
      />
    </div>
  );
}
