"use client";

import { useState, useRef, useEffect } from "react";
import { Ellipsis, Pencil, Plus, FolderOpen, Trash2, AlertTriangle } from "lucide-react";
import { projectListProps } from "@/lib/api/projects";
import { truncateTitle } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { fetchDocs, selectProject } from "@/store/docSlice";
import { useSession } from "next-auth/react";


export function ProjectsSection({
  projects,
  activeProjectId,
  onAdd,
  onRename,
  onDelete,
}: {
  projects: projectListProps[];
  activeProjectId?: string;
  onAdd?: () => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogProject, setDeleteDialogProject] = useState<{ id: string; name: string } | null>(null);
  const [value, setValue] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  function viewProjectDetail(projectId: string, name: string) {
    router.push(`/workspace/${projectId}`);
    dispatch(selectProject(name));
    dispatch(fetchDocs({ projectId, userId: userId ?? "" }));
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div>
      {/* Delete confirmation dialog */}
      {deleteDialogProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[340px] rounded-2xl border border-border bg-background shadow-2xl p-6">
            <div className="flex gap-3 items-start mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Delete project?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">"{truncateTitle(deleteDialogProject.name, 36)}"</span> and all its data will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteDialogProject(null)}
                className="px-4 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete?.(deleteDialogProject.id);
                  setDeleteDialogProject(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
        <span>Projects</span>
        <button
          onClick={onAdd}
          className="cursor-pointer rounded-full bg-muted p-1 hover:bg-border transition-colors"
          title="New project"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* List */}
      <div className="space-y-0.5 h-80 cursor-pointer overflow-y-auto pl-2 text-sm">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project._id}
              onClick={() => viewProjectDetail(project._id, project?.name)}
              className={`group relative flex items-center justify-between rounded-md px-2 py-2 transition-colors ${
                activeProjectId === project._id
                  ? "bg-[var(--l-tint)] text-[var(--l-moss)] font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {/* Name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {editingId === project._id ? (
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => {
                      if (value.trim()) onRename?.(project._id, value);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { onRename?.(project._id, value); setEditingId(null); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full bg-transparent outline-none border-b text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate text-foreground" title={project.name}>
                    {truncateTitle(project.name, 22)}
                  </span>
                )}
              </div>

              {/* Three-dot menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === project._id ? null : project._id);
                }}
                className="opacity-0 cursor-pointer group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              >
                <Ellipsis size={15} />
              </button>

              {/* Context menu */}
              {menuOpenId === project._id && (
                <div
                  ref={menuRef}
                  className="absolute right-2 top-8 z-20 w-36 rounded-md border border-border bg-popover text-popover-foreground shadow-md overflow-hidden"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(project._id);
                      setValue(project.name);
                      setMenuOpenId(null);
                    }}
                    className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialogProject({ id: project._id, name: project.name });
                      setMenuOpenId(null);
                    }}
                    className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center px-4">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FolderOpen size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground">
                Create a project to start chatting with AI
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
