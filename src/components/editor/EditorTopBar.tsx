"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Users, Pencil } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { setActiveRoom, toggleCreateRoomModal } from "@/store/roomSlice";
import { CreateRoomModal } from "@/components/room/RoomModal";
import { getRoomForProject } from "@/lib/api/rooms";

export function EditorTopBar({
  projectId,
  roomId,
}: {
  projectId: string;
  roomId?: string;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const activeRoom = useSelector((s: RootState) => s.room.activeRoom);
  const pathname = usePathname();

  // Restore room state on mount — prefer URL param, fall back to DB lookup
  useEffect(() => {
    if (!projectId || activeRoom) return;
    if (roomId) {
      fetch(`/api/rooms/${roomId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.room) {
            dispatch(setActiveRoom({
              roomId: data.room.roomId,
              name: data.room.name,
              projectId: data.room.projectId?.toString() ?? projectId,
            }));
          }
        })
        .catch(() => {});
    } else {
      // No roomId in URL — check if this project has an active room in DB
      getRoomForProject(projectId)
        .then((room) => {
          if (room) {
            dispatch(setActiveRoom({
              roomId: room.roomId,
              name: room.name,
              projectId: room.projectId,
              ...(room.password ? { password: room.password } : {}),
            }));
          }
        })
        .catch(() => {});
    }
  }, [roomId, projectId, activeRoom, dispatch]);

  // Keep URL in sync with activeRoom so reloads preserve the room.
  // Use window.history.replaceState (not router.replace) to avoid triggering a
  // Next.js RSC navigation that would cause ChatBox to refetch history mid-stream.
  useEffect(() => {
    if (activeRoom?.roomId && activeRoom.roomId !== roomId) {
      window.history.replaceState(null, "", `${pathname}?roomId=${activeRoom.roomId}`);
    }
  }, [activeRoom?.roomId, roomId, pathname]);

  const backUrl = activeRoom?.roomId
    ? `/workspace/${projectId}?roomId=${activeRoom.roomId}`
    : roomId
    ? `/workspace/${projectId}?roomId=${roomId}`
    : `/workspace/${projectId}`;

  return (
    <header
      style={{
        height: 44,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid var(--l-br)",
        backgroundColor: "var(--l-bg)",
        padding: "0 16px",
      }}
    >
      <Link
        href={backUrl}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          color: "var(--l-ink2)",
          textDecoration: "none",
          padding: "4px 8px",
          borderRadius: 6,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--l-sf)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        <ArrowLeft size={13} />
        Workspace
      </Link>

      <span style={{ color: "var(--l-br)", fontSize: 16, lineHeight: 1 }}>›</span>

      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          fontWeight: 500,
          color: "var(--l-ink)",
        }}
      >
        <Pencil size={12} style={{ color: "var(--l-moss)" }} />
        Notes
      </span>

      {activeRoom && (
        <>
          <span style={{ color: "var(--l-br)", fontSize: 16, lineHeight: 1 }}>·</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 999,
              backgroundColor: "var(--l-tint)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--l-moss)",
              letterSpacing: "0.01em",
            }}
          >
            <Users size={11} />
            {activeRoom.name}
          </span>
        </>
      )}

      {/* Share Room button — pushed to the right */}
      <div style={{ marginLeft: "auto" }}>
        <button
          onClick={() => dispatch(toggleCreateRoomModal())}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 7,
            border: "1px solid var(--l-moss)",
            background: "transparent",
            color: "var(--l-moss)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--l-tint)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Users size={13} />
          Share Room
        </button>
      </div>

      <CreateRoomModal projectId={projectId} />
    </header>
  );
}
