"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  X, Copy, Check, Eye, EyeOff, Trash2, ExternalLink, Users, Plus, LogIn, AlertTriangle,
} from "lucide-react";
import { AppDispatch, RootState } from "@/store";
import {
  toggleCreateRoomModal, toggleJoinRoomModal, toggleMyRoomsModal,
  setActiveRoom, clearActiveRoom,
} from "@/store/roomSlice";
import {
  createRoom, joinRoom, getRooms, getRoomForProject, deleteRoom, saveRoomPassword, type RoomSummary,
} from "@/lib/api/rooms";
import { cn } from "@/lib/utils";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-background shadow-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const isPassword = label.toLowerCase().includes("password");

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2">
        <code className="flex-1 text-sm font-mono text-foreground break-all select-all">
          {isPassword && !show ? "•".repeat(Math.min(value.length, 20)) : value}
        </code>
        {isPassword && (
          <button onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        <button onClick={copy} className="text-muted-foreground hover:text-[var(--l-moss)] transition-colors">
          {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

function Field({ label, id, type = "text", value, onChange, placeholder, error }: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input
        id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
          "bg-background text-foreground placeholder:text-muted-foreground",
          error ? "border-red-400 focus:border-red-500" : "border-border focus:border-[var(--l-moss)]",
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Btn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className={cn("w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors",
        loading ? "opacity-50 bg-[var(--l-moss)] cursor-not-allowed" : "bg-[var(--l-moss)] hover:bg-[var(--l-moss2)]"
      )}>
      {loading ? "Please wait…" : label}
    </button>
  );
}

// ─── Create Room Modal ────────────────────────────────────────────────────────

type ProjectRoom = { roomId: string; name: string; projectId: string; password?: string };

export function CreateRoomModal({ projectId: propProjectId }: { projectId: string | undefined }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const open = useSelector((s: RootState) => s.room.createModal);
  const projects: any[] = useSelector((s: RootState) => (s.project as any).projects?.projects ?? []);

  // undefined = still checking DB, null = no room, object = room exists
  const [projectRoom, setProjectRoom] = useState<ProjectRoom | null | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [savePasswordInput, setSavePasswordInput] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savePasswordError, setSavePasswordError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ProjectRoom | null>(null);

  const effectiveProjectId = propProjectId ?? selectedProjectId;

  // Every time the modal opens, query DB directly — no dependency on Redux activeRoom
  useEffect(() => {
    if (!open) { setProjectRoom(undefined); return; }
    if (!propProjectId) { setProjectRoom(null); return; }
    setChecking(true);
    getRoomForProject(propProjectId)
      .then(setProjectRoom)
      .catch(() => setProjectRoom(null))
      .finally(() => setChecking(false));
  }, [open, propProjectId]);

  const close = () => {
    dispatch(toggleCreateRoomModal());
    setName(""); setPassword(""); setSelectedProjectId(""); setError(""); setCreated(null);
    setSavePasswordInput(""); setSavePasswordError("");
  };

  const handleSavePassword = async () => {
    if (!projectRoom || !savePasswordInput) return;
    setSavePasswordError("");
    setSavingPassword(true);
    try {
      await saveRoomPassword(projectRoom.roomId, savePasswordInput);
      setProjectRoom({ ...projectRoom, password: savePasswordInput });
      setSavePasswordInput("");
    } catch (err: any) {
      setSavePasswordError(err.message ?? "Failed to save");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!effectiveProjectId) { setError("Select a project first"); return; }
    if (!name.trim()) { setError("Room name is required"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }

    setLoading(true);
    try {
      const room = await createRoom({ name: name.trim(), password, projectId: effectiveProjectId });
      const full = { ...room, password };
      dispatch(setActiveRoom(full));
      setProjectRoom(full);
      setCreated(full);
    } catch (err: any) {
      setError(err.message ?? "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const openWorkspace = (pid: string, rid: string) => {
    close();
    router.push(`/workspace/${pid}?roomId=${rid}`);
  };

  // Existing room to show credentials for
  const existing = created ?? (projectRoom ?? null);
  const showExisting = existing !== null && !(!created && projectRoom === null);

  return (
    <Modal open={open} onClose={close} title={!created && projectRoom ? "Active room" : "Create a collaboration room"}>
      {checking || projectRoom === undefined ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Checking…</p>
      ) : !created && projectRoom ? (
        // Existing room — show credentials from DB
        <div>
          <div className="mb-4 rounded-xl bg-[var(--l-tint)] border border-[var(--l-moss)]/30 px-4 py-3 text-sm text-[var(--l-moss)]">
            This project already has an active room. Share these credentials.
          </div>
          <CopyField label="Room ID" value={projectRoom.roomId} />
          {projectRoom.password ? (
            <CopyField label="Password" value={projectRoom.password} />
          ) : (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">
                Password not saved yet. Enter the password you set when creating this room.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={savePasswordInput}
                  onChange={e => setSavePasswordInput(e.target.value)}
                  placeholder="Enter room password"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--l-moss)]"
                />
                <button
                  onClick={handleSavePassword}
                  disabled={savingPassword || !savePasswordInput}
                  className="rounded-lg bg-[var(--l-moss)] hover:bg-[var(--l-moss2)] text-white px-3 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {savingPassword ? "…" : "Save"}
                </button>
              </div>
              {savePasswordError && <p className="mt-1.5 text-xs text-red-500">{savePasswordError}</p>}
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button onClick={() => openWorkspace(projectRoom.projectId, projectRoom.roomId)}
              className="flex-1 rounded-lg bg-[var(--l-moss)] hover:bg-[var(--l-moss2)] text-white py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <ExternalLink size={14} /> Open workspace
            </button>
            <button onClick={close}
              className="flex-1 rounded-lg border border-border hover:bg-muted text-sm py-2.5 transition-colors text-foreground">
              Done
            </button>
          </div>
        </div>
      ) : created ? (
        // Just created — show success + credentials
        <div>
          <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            ✓ Room created! Share these with collaborators.
          </div>
          <CopyField label="Room ID" value={created.roomId} />
          <CopyField label="Password" value={created.password!} />
          <div className="mt-5 flex gap-2">
            <button onClick={() => openWorkspace(created.projectId, created.roomId)}
              className="flex-1 rounded-lg bg-[var(--l-moss)] hover:bg-[var(--l-moss2)] text-white py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <ExternalLink size={14} /> Open workspace
            </button>
            <button onClick={close}
              className="flex-1 rounded-lg border border-border hover:bg-muted text-sm py-2.5 transition-colors text-foreground">
              Done
            </button>
          </div>
        </div>
      ) : (
        // No existing room — show create form
        <form onSubmit={handleSubmit}>
          <Field label="Room name" id="cr-name" value={name} onChange={setName} placeholder="e.g. Research Sprint" />

          {!propProjectId && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Project</label>
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--l-moss)]">
                <option value="">— choose a project —</option>
                {projects.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <Field label="Password (share with collaborators)" id="cr-password" type="password" value={password} onChange={setPassword} placeholder="Min 4 characters" />

          {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
          <Btn loading={loading} label="Create room" />
        </form>
      )}
    </Modal>
  );
}

// ─── Join Room Modal ──────────────────────────────────────────────────────────

export function JoinRoomModal() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const open = useSelector((s: RootState) => s.room.joinModal);

  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    dispatch(toggleJoinRoomModal());
    setRoomId(""); setPassword(""); setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!roomId.trim()) { setError("Room ID is required"); return; }
    if (!password) { setError("Password is required"); return; }

    setLoading(true);
    try {
      const room = await joinRoom({ roomId: roomId.trim().toLowerCase(), password });
      dispatch(setActiveRoom({ roomId: room.roomId, name: room.name, projectId: room.projectId }));
      close();
      router.push(`/workspace/${room.projectId}?roomId=${room.roomId}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Join a room">
      <form onSubmit={handleSubmit}>
        <Field label="Room ID" id="jr-id" value={roomId} onChange={setRoomId} placeholder="e.g. a1b2c3d4e5f6" />
        <Field label="Password" id="jr-password" type="password" value={password} onChange={setPassword} placeholder="Room password" />
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <Btn loading={loading} label="Join room" />
      </form>
    </Modal>
  );
}

// ─── Password reveal inline (for My Rooms list) ──────────────────────────────

function PasswordReveal({ password }: { password: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <code className="text-xs font-mono text-muted-foreground">
        {show ? password : "•".repeat(Math.min(password.length, 16))}
      </code>
      <button onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
      <button onClick={copy} className="text-muted-foreground hover:text-[var(--l-moss)] transition-colors">
        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

// ─── My Rooms Modal ───────────────────────────────────────────────────────────

export function MyRoomsModal() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const open = useSelector((s: RootState) => s.room.myRoomsModal);
  const activeRoom = useSelector((s: RootState) => s.room.activeRoom);
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getRooms().then(setRooms).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  const close = () => dispatch(toggleMyRoomsModal());

  const openRoom = (r: RoomSummary) => {
    dispatch(setActiveRoom({ roomId: r.roomId, name: r.name, projectId: r.projectId, ...(r.password ? { password: r.password } : {}) }));
    close();
    router.push(`/workspace/${r.projectId}?roomId=${r.roomId}`);
  };

  const handleDelete = async (roomId: string) => {
    setDeleting(roomId);
    setDeleteError(null);
    try {
      await deleteRoom(roomId);
      setRooms(prev => prev.filter(r => r.roomId !== roomId));
      if (activeRoom?.roomId === roomId) dispatch(clearActiveRoom());
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message ?? "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const copyId = (roomId: string) => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
    {deleteTarget && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="w-[340px] rounded-2xl border border-border bg-background shadow-2xl p-6">
          <div className="flex gap-3 items-start mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Delete room?</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium text-foreground">"{deleteTarget.name}"</span> will be permanently removed and all members will lose access.
              </p>
            </div>
          </div>
          {deleteError && (
            <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
              className="px-4 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteTarget.roomId)}
              disabled={deleting === deleteTarget.roomId}
              className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              {deleting === deleteTarget.roomId ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}
    <Modal open={open} onClose={close} title="My rooms">
      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rooms.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          No rooms yet. Create one to start collaborating.
        </div>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {rooms.map(r => (
            <li key={r.roomId} className={cn(
              "rounded-xl border px-4 py-3 transition-colors",
              activeRoom?.roomId === r.roomId
                ? "border-[var(--l-moss)]/40 bg-[var(--l-tint)]"
                : "border-border bg-muted/50",
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  <button onClick={() => copyId(r.roomId)}
                    className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--l-moss)] transition-colors">
                    <code className="font-mono">{r.roomId}</code>
                    {copiedId === r.roomId ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                  </button>
                  {r.password && (
                    <PasswordReveal password={r.password} />
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.memberCount} member{r.memberCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openRoom(r)} title="Switch to this room"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--l-tint)] hover:text-[var(--l-moss)] transition-colors">
                    <ExternalLink size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    disabled={deleting === r.roomId || r.ownerId !== userId}
                    title={r.ownerId !== userId ? "Only the owner can delete" : "Delete room"}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={() => { close(); dispatch(toggleCreateRoomModal()); }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <Plus size={13} /> New room
        </button>
        <button onClick={() => { close(); dispatch(toggleJoinRoomModal()); }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <LogIn size={13} /> Join room
        </button>
      </div>
    </Modal>
    </>
  );
}

// ─── Room Badge ───────────────────────────────────────────────────────────────

export function RoomBadge() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const activeRoom = useSelector((s: RootState) => s.room.activeRoom);
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    if (!activeRoom) return;
    const projectId = activeRoom.projectId;
    dispatch(clearActiveRoom());
    router.push(`/workspace/${projectId}`);
  };

  if (!activeRoom) return null;

  return (
    <div className="mx-3 mb-2 rounded-xl border border-[var(--l-moss)]/30 bg-[var(--l-tint)] px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-[var(--l-moss)] flex items-center gap-1.5">
          <Users size={11} />
          {activeRoom.name}
        </span>
        <button onClick={leaveRoom} title="Leave room"
          className="text-[var(--l-moss)]/60 hover:text-[var(--l-moss)] transition-colors">
          <X size={12} />
        </button>
      </div>
      <button onClick={copyId}
        className="flex items-center gap-1 text-[11px] text-[var(--l-moss)] hover:text-[var(--l-moss2)] transition-colors font-mono">
        {activeRoom.roomId}
        {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
      </button>
    </div>
  );
}
