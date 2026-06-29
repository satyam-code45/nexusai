"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchDocs, fetchSources, viewPdf, attribMindMapModalData, selectedReport } from "@/store/docSlice";
import { toggleAddSourceModal } from "@/store/projectSlice";
import {
  toggleCreateRoomModal,
  toggleJoinRoomModal,
  toggleMyRoomsModal,
} from "@/store/roomSlice";
import {
  Pencil, Plus, Users, LogIn, DoorOpen, FileText, BarChart2,
  BrainCircuit, GraduationCap, Trash2, Eye, AlertTriangle,
} from "lucide-react";
import { truncateTitle } from "@/lib/utils";
import { reportDataType } from "@/lib/api/projects";
import { showError, showSuccess } from "@/lib/utils";

type Props = { userId: string; projectId: string; roomId?: string };

export default function WorkspaceDashboard({ userId, projectId, roomId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { docs, sources, loading } = useSelector((s: RootState) => s.doc);
  const { projects } = useSelector((s: RootState) => s.project);
  const activeRoom = useSelector((s: RootState) => s.room.activeRoom);

  const project = projects?.projects?.find((p) => p._id === projectId);

  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "doc" | "report"; id: string; name: string } | null>(null);

  useEffect(() => {
    if (userId && projectId) {
      dispatch(fetchDocs({ projectId, userId, roomId }));
      dispatch(fetchSources({ projectId, userId, roomId }));
    }
  }, [dispatch, userId, projectId, roomId]);

  const editorHref = activeRoom?.roomId
    ? `/workspace/${projectId}/editor?roomId=${activeRoom.roomId}`
    : roomId
    ? `/workspace/${projectId}/editor?roomId=${roomId}`
    : `/workspace/${projectId}/editor`;

  const refresh = () => {
    dispatch(fetchDocs({ projectId, userId, roomId }));
    dispatch(fetchSources({ projectId, userId, roomId }));
  };

  async function handleDeleteDoc(id: string) {
    setDeletingDoc(id);
    try {
      const res = await fetch(`/api/projects/docs?id=${id}&projectId=${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showSuccess("Source removed");
      dispatch(fetchDocs({ projectId, userId, roomId }));
    } catch {
      showError("Could not delete source");
    } finally {
      setDeletingDoc(null);
      setConfirmDelete(null);
    }
  }

  async function handleDeleteReport(id: string) {
    setDeletingReport(id);
    try {
      const res = await fetch(`/api/reports?id=${id}&projectId=${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showSuccess("Report removed");
      dispatch(fetchSources({ projectId, userId, roomId }));
    } catch {
      showError("Could not delete report");
    } finally {
      setDeletingReport(null);
      setConfirmDelete(null);
    }
  }

  function viewReport(doc: reportDataType) {
    if (doc.source_type === "mindMap") {
      dispatch(attribMindMapModalData({ ...doc, modal: true }));
    } else {
      dispatch(selectedReport(doc));
    }
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--l-bg)",
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--l-moss) 0%, var(--l-moss2) 100%)",
          borderRadius: 14,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          boxShadow: "0 4px 20px rgba(58,90,60,0.25)",
        }}
      >
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 5 }}>
            Project Workspace
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>
            {project?.name ?? "Your Project"}
          </h1>
          {activeRoom && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 8, padding: "3px 10px",
                background: "rgba(255,255,255,0.18)", borderRadius: 999,
                fontSize: 11, fontWeight: 600, color: "#fff",
              }}
            >
              <Users size={11} /> {activeRoom.name}
            </span>
          )}
        </div>
        <Link
          href={editorHref}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 20px", borderRadius: 9,
            background: "var(--l-bg)", color: "var(--l-moss)",
            fontWeight: 700, fontSize: 13,
            textDecoration: "none", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            whiteSpace: "nowrap",
          }}
        >
          <Pencil size={13} /> Open Editor
        </Link>
      </div>

      {/* ── Room actions ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ActionBtn icon={<Users size={13} />} label="Share Room" onClick={() => dispatch(toggleCreateRoomModal())} />
        <ActionBtn icon={<LogIn size={13} />} label="Join Room" onClick={() => dispatch(toggleJoinRoomModal())} />
        <ActionBtn icon={<DoorOpen size={13} />} label="My Rooms" onClick={() => dispatch(toggleMyRoomsModal())} />
      </div>

      {/* ── Library ───────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <SectionHeader
            icon={<FileText size={14} style={{ color: "var(--l-moss)" }} />}
            title="Library"
            subtitle="PDFs, videos, weblinks and other source materials"
          />
          <button
            onClick={() => dispatch(toggleAddSourceModal())}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              background: "var(--l-moss)", border: "none",
              color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={13} /> Add Source
          </button>
        </div>

        {loading ? (
          <GridSkeleton />
        ) : (docs as any[])?.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: 10,
            }}
          >
            {(docs as any[]).map((doc) => (
              <DocCard
                key={doc._id}
                doc={doc}
                projectId={projectId}
                deleting={deletingDoc === doc._id}
                onDelete={() => setConfirmDelete({ type: "doc", id: doc._id, name: doc.title })}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            message="No sources yet"
            action={{ label: "Add your first source", onClick: () => dispatch(toggleAddSourceModal()) }}
          />
        )}
      </section>

      {/* ── Reports & Analysis ───────────────────────────────────────── */}
      <section style={{ paddingBottom: 32 }}>
        <SectionHeader
          icon={<BarChart2 size={14} style={{ color: "var(--l-moss)" }} />}
          title="Reports & Analysis"
          subtitle="AI-generated summaries, study guides and mind maps"
        />

        {loading ? (
          <ListSkeleton />
        ) : (sources as any[])?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(sources as any[]).map((src) => (
              <ReportRow
                key={src._id}
                src={src}
                deleting={deletingReport === src._id}
                onView={() => viewReport(src as reportDataType)}
                onDelete={() => setConfirmDelete({ type: "report", id: src._id, name: src.title })}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No reports yet. Select sources in the editor and generate a report via chat." />
        )}
      </section>

      {/* Room modals rendered in LeftPanel — no duplicates needed here */}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <ConfirmDialog
          name={confirmDelete.name}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.type === "doc") handleDeleteDoc(confirmDelete.id);
            else handleDeleteReport(confirmDelete.id);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 13px", borderRadius: 7,
        border: "1px solid var(--l-br)", background: "var(--l-sf)",
        fontSize: 12, fontWeight: 500, color: "var(--l-ink)", cursor: "pointer",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--l-tint)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--l-moss)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--l-sf)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--l-br)"; }}
    >
      {icon} {label}
    </button>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--l-ink)", margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 11, color: "var(--l-ink3)", marginTop: 2, marginLeft: 20 }}>{subtitle}</p>
    </div>
  );
}

function DocCard({
  doc, projectId, deleting, onDelete,
}: {
  doc: any; projectId: string; deleting: boolean; onDelete: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const isPdf = doc.source_type?.toLowerCase().includes("pdf") || doc.fileName?.toLowerCase().includes(".pdf");
  const iconSrc = getIconSrc(doc.source_type);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--l-sf)",
        border: `1px solid ${hovered ? "var(--l-br)" : "var(--l-br)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.07)" : "none",
      }}
    >
      {/* Delete btn */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={deleting}
          style={{
            position: "absolute", top: 8, right: 8,
            background: "#FEE2E2", border: "none", borderRadius: 5,
            padding: "3px 5px", cursor: "pointer",
            display: "flex", alignItems: "center",
          }}
          title="Delete"
        >
          <Trash2 size={12} style={{ color: "#EF4444" }} />
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ position: "relative", width: 26, height: 26, flexShrink: 0 }}>
          <Image src={iconSrc} alt="" fill className="object-contain" sizes="26px" />
        </div>
        <span
          style={{ fontSize: 12, fontWeight: 500, color: "var(--l-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
          title={doc.title}
        >
          {truncateTitle(doc.title, 24)}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {isPdf && (
          <button
            onClick={() => {
              const pdfSrc = doc.fileUrl || `${process.env.NEXT_PUBLIC_APP_URL}/uploads/${doc.fileName}`;
              // Store in sessionStorage for resilience, but dispatch first so Redux
              // state is already set when the editor page component mounts (client nav)
              dispatch(viewPdf(pdfSrc));
              sessionStorage.setItem("nexusai_viewPdf", pdfSrc);
              router.push(`/workspace/${projectId}/editor`);
            }}
            style={pillBtn("var(--l-tint)", "var(--l-moss)")}
          >
            <Eye size={10} /> View PDF
          </button>
        )}
      </div>

      <span
        style={{
          fontSize: 10, fontWeight: 600,
          color: sourceTypeColor(doc.source_type),
          background: sourceTypeBg(doc.source_type),
          padding: "2px 7px", borderRadius: 4,
          alignSelf: "flex-start", textTransform: "uppercase", letterSpacing: "0.04em",
        }}
      >
        {doc.source_type || "file"}
      </span>
    </div>
  );
}

function ReportRow({ src, deleting, onView, onDelete }: {
  src: any; deleting: boolean; onView: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--l-sf)",
        border: `1px solid ${hovered ? "var(--l-br)" : "var(--l-br)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <ReportIcon type={src.source_type} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--l-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {truncateTitle(src.title ?? "Report", 60)}
        </p>
        <p style={{ fontSize: 11, color: "var(--l-ink3)", margin: 0, marginTop: 1 }}>
          {reportTypeLabel(src.source_type)}
          {src.total_source ? ` · ${src.total_source} source${src.total_source > 1 ? "s" : ""}` : ""}
          {src.createdAt ? ` · ${new Date(src.createdAt).toLocaleDateString()}` : ""}
        </p>
      </div>

      {hovered && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={onView} style={pillBtn("var(--l-tint)", "var(--l-moss)")}>
            <Eye size={11} /> View
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            style={pillBtn("#FEE2E2", "#EF4444")}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ReportIcon({ type }: { type: string }) {
  const size = 15;
  const wrapStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };

  if (type === "mindMap") return <div style={{ ...wrapStyle, background: "#D1FAE5" }}><BrainCircuit size={size} style={{ color: "#059669" }} /></div>;
  if (type === "Studyguide") return <div style={{ ...wrapStyle, background: "var(--l-tint)" }}><GraduationCap size={size} style={{ color: "var(--l-moss)" }} /></div>;
  return <div style={{ ...wrapStyle, background: "#EFF6FF" }}><FileText size={size} style={{ color: "#3B82F6" }} /></div>;
}

function ConfirmDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--l-sf)", borderRadius: 14, padding: "24px 28px",
          width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--l-ink)", margin: 0 }}>Delete item?</p>
            <p style={{ fontSize: 13, color: "var(--l-ink2)", marginTop: 4 }}>
              <strong>"{truncateTitle(name, 40)}"</strong> will be permanently removed. This cannot be undone.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid var(--l-br)", background: "var(--l-sf)", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--l-ink)" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ background: "var(--l-sf)", border: "1px dashed var(--l-br)", borderRadius: 10, padding: "24px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--l-ink3)", margin: 0 }}>{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7, background: "var(--l-moss)", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={12} /> {action.label}
        </button>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: "var(--l-br)", borderRadius: 10, height: 80, animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: "var(--l-br)", borderRadius: 10, height: 52, animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pillBtn(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 600, color,
    background: bg, border: "none", borderRadius: 5,
    padding: "4px 9px", cursor: "pointer",
  };
}

function getIconSrc(source_type: string = ""): string {
  const t = source_type.trim().toLowerCase();
  if (t.includes("youtube")) return "/icons/youtube.png";
  if (t.includes("doc") || t.includes("docx")) return "/icons/doc.png";
  if (t.includes("weblink")) return "/icons/web.png";
  if (t.includes(".pptx") || t.includes(".ppt") || t.includes(".ppsx")) return "/icons/powerpoint.png";
  if (t.includes("pdf")) return "/icons/pdf.png";
  return "/icons/text.png";
}

function sourceTypeColor(t = "") {
  const s = t.toLowerCase();
  if (s.includes("pdf")) return "#DC2626";
  if (s.includes("youtube")) return "#B91C1C";
  if (s.includes("weblink")) return "#0369A1";
  if (s.includes("doc")) return "#1D4ED8";
  return "var(--l-ink3)";
}

function sourceTypeBg(t = "") {
  const s = t.toLowerCase();
  if (s.includes("pdf")) return "#FEF2F2";
  if (s.includes("youtube")) return "#FFF7F7";
  if (s.includes("weblink")) return "#F0F9FF";
  if (s.includes("doc")) return "#EFF6FF";
  return "var(--l-tint)";
}

function reportTypeLabel(type: string) {
  if (type === "mindMap") return "Mind Map";
  if (type === "Studyguide") return "Study Guide";
  if (type === "summary") return "Summary";
  return type ?? "Report";
}
