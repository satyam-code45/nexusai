"use client";

import { useEffect } from "react";
import {
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  LogIn,
  DoorOpen,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { cn, showError, showSuccess } from "@/lib/utils";
import { ProjectsSection } from "./ProjectSection";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchProjects, toggleModal, toggleSearchProjectModal, removeProject } from "@/store/projectSlice";
import { ProjectModal } from "../project/ProjectModal";
import { updateProject, deleteProject } from "@/lib/api/projects";
import AccountButton from "./AccountButton";
import { toggleCreateRoomModal, toggleJoinRoomModal, toggleMyRoomsModal, setActiveRoom } from "@/store/roomSlice";
import { CreateRoomModal, JoinRoomModal, MyRoomsModal, RoomBadge } from "@/components/room/RoomModal";
import { getRoomForProject } from "@/lib/api/rooms";

type LeftPanelProps = {
  userId: string | undefined;
  projectId: string | undefined;
  roomId?: string | undefined;
};

export default function LeftPanel({ userId, projectId, roomId }: LeftPanelProps) {
  const { data: session } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const { projects } = useSelector((state: RootState) => state.project);
  const activeRoom = useSelector((s: RootState) => s.room.activeRoom);

  const [open, setOpen] = useState(true);

  // Restore room state from DB on mount — URL param takes precedence over project lookup
  useEffect(() => {
    if (!projectId || activeRoom) return;

    if (roomId) {
      // Specific room requested via URL — fetch it directly (includes password for owners)
      fetch(`/api/rooms/${roomId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.room) {
            dispatch(setActiveRoom({
              roomId: data.room.roomId,
              name: data.room.name,
              projectId: data.room.projectId?.toString() ?? projectId,
              ...(data.room.password ? { password: data.room.password } : {}),
            }));
          }
        })
        .catch(() => {});
    } else {
      // No URL roomId — check if this project already has a room in DB
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
  }, [projectId, roomId]);

  useEffect(() => {
    if (userId) {
      dispatch(fetchProjects({ page: 1, search: "", userId }));
    }
  }, [dispatch, userId]);

  const renameProject = async ({ id, name }: { id: string; name: string }) => {
    try {
      const res = await updateProject({ id, name });
      showSuccess(res?.message);
    } catch (error) {
      showError((error as Error)?.message);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      dispatch(removeProject(id)); // optimistic update
      await deleteProject(id);
      showSuccess("Project deleted");
    } catch (error) {
      showError((error as Error)?.message ?? "Failed to delete project");
      // Re-fetch to restore correct list on failure
      if (userId) dispatch(fetchProjects({ page: 1, search: "", userId }));
    }
  };

  return (
    <div className="relative flex h-full">
      {/* Reopen handle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-4 z-50 rounded-r-md border bg-background p-2 shadow-md hover:bg-muted transition-all duration-300"
          aria-label="Open menu"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* ── Single sidebar rail ────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-background transition-all duration-300 ease-in-out overflow-hidden",
          open ? "w-56 opacity-100" : "w-0 opacity-0"
        )}
      >
        <div className={cn("flex h-full flex-col", !open && "hidden")}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
              {session?.user?.name}
            </span>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* Nav */}
          <nav className="space-y-0.5 px-2 py-3 text-sm">
            <MenuItem
              icon={<Search size={15} />}
              label="Search Projects"
              onClick={() => dispatch(toggleSearchProjectModal())}
            />

            <div className="pt-1 mt-1 border-t border-border space-y-0.5">
              <MenuItem
                icon={<Users size={15} />}
                label="Share Room"
                onClick={() => dispatch(toggleCreateRoomModal())}
              />
              <MenuItem
                icon={<LogIn size={15} />}
                label="Join Room"
                onClick={() => dispatch(toggleJoinRoomModal())}
              />
              <MenuItem
                icon={<DoorOpen size={15} />}
                label="My Rooms"
                onClick={() => dispatch(toggleMyRoomsModal())}
              />
            </div>
          </nav>

          {/* Modals */}
          <ProjectModal session={session} />
          <CreateRoomModal projectId={projectId} />
          <JoinRoomModal />
          <MyRoomsModal />

          {/* Projects list */}
          <div className="flex-1 overflow-hidden px-2 py-2">
            <ProjectsSection
              projects={projects?.projects ?? []}
              activeProjectId={projectId}
              onAdd={() => dispatch(toggleModal())}
              onRename={async (id, name) => await renameProject({ id, name })}
              onDelete={handleDeleteProject}
            />
          </div>

          <RoomBadge />
          <AccountButton />
        </div>
      </aside>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

