"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { addDocIds, viewPdf, fetchDocs, setViewSourceType, fetchSources } from "@/store/docSlice";
import { reportDataType } from "@/lib/api/projects";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { useEditorCollab } from "@/contexts/EditorCollabContext";
import {
  Search, Plus, PanelLeftClose, PanelLeftOpen,
  FileText, CheckSquare, Square, BarChart2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import ReportList from "@/components/leftpanel/ReportList";

interface SourcesSidebarProps {
  projectId: string;
  userId: string;
}

function getSourceUrl(doc: any): string | null {
  return doc.fileUrl || (doc.fileName ? `${process.env.NEXT_PUBLIC_APP_URL}/uploads/${doc.fileName}` : null);
}

export function SourcesSidebar({ projectId, userId }: SourcesSidebarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { docs, docIds, loading, sources } = useSelector((state: RootState) => state.doc);
  const { activeRoom } = useSelector((state: RootState) => state.room);
  const { provider, peerTriggeredViewRef } = useEditorCollab();

  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");

  // Track the last peer sourceListVersion we acted on to avoid re-fetching on
  // our own broadcast (awareness fires for local client too)
  const lastSeenPeerVersionRef = useRef<number>(0);

  useEffect(() => {
    if (window.innerWidth < 768) setOpen(false);
  }, []);

  // Keep CSS variable in sync so RightPanel can align with the sidebar edge on small screens
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", open ? "256px" : "0px");
  }, [open]);

  useEffect(() => {
    if (projectId && userId) {
      const roomId = activeRoom?.roomId;
      dispatch(fetchDocs({ projectId, userId, roomId }));
      dispatch(fetchSources({ projectId, userId, roomId }));
    }
  }, [projectId, userId, activeRoom?.roomId, dispatch]);

  // ── Source-list sync: refetch when any PEER uploads/deletes a source ────────
  const lastSeenReportVersionRef = useRef<number>(0);
  useEffect(() => {
    if (!provider) return;
    const myClientId = provider.awareness.clientID;

    const handler = () => {
      let newestSourceVersion = 0;
      let newestReportVersion = 0;
      provider.awareness.getStates().forEach((state: any, clientId: number) => {
        if (clientId === myClientId) return;
        if ((state.sourceListVersion ?? 0) > newestSourceVersion)
          newestSourceVersion = state.sourceListVersion;
        if ((state.reportListVersion ?? 0) > newestReportVersion)
          newestReportVersion = state.reportListVersion;
      });
      const roomId = activeRoom?.roomId;
      if (newestSourceVersion > lastSeenPeerVersionRef.current) {
        lastSeenPeerVersionRef.current = newestSourceVersion;
        dispatch(fetchDocs({ projectId, userId, roomId }));
        dispatch(fetchSources({ projectId, userId, roomId }));
      } else if (newestReportVersion > lastSeenReportVersionRef.current) {
        lastSeenReportVersionRef.current = newestReportVersion;
        dispatch(fetchSources({ projectId, userId, roomId }));
      }
    };

    provider.awareness.on("change", handler);
    return () => provider.awareness.off("change", handler);
  }, [provider, projectId, userId, activeRoom?.roomId, dispatch]);

  // ── View-source sync: open same source as a peer when they click one ────────
  useEffect(() => {
    if (!provider) return;
    const myClientId = provider.awareness.clientID;

    const applyPeerSource = (state: any) => {
      if (!state?.viewingSource?.fileUrl) return;
      const { fileUrl, sourceType } = state.viewingSource;
      sessionStorage.setItem("nexusai_viewPdf", fileUrl);
      sessionStorage.setItem("nexusai_viewSourceType", sourceType ?? "");
      // Flag so MiddlePanel's viewPdf watcher skips re-broadcasting this change
      peerTriggeredViewRef.current = true;
      dispatch(viewPdf(fileUrl));
      dispatch(setViewSourceType(sourceType ?? null));
    };

    // Catch up to any source a peer already has open when we first connect
    provider.awareness.getStates().forEach((state: any, clientId: number) => {
      if (clientId !== myClientId) applyPeerSource(state);
    });

    // Only process clients whose state actually changed — iterating all peers on
    // every event would re-apply a stale peer state when the local client fires
    // their own awareness update, swapping what's shown on each screen.
    const handler = ({ added, updated }: { added: number[]; updated: number[]; removed: number[] }) => {
      [...added, ...updated].forEach(clientId => {
        if (clientId === myClientId) return;
        const peerState = provider.awareness.getStates().get(clientId);
        if (peerState) applyPeerSource(peerState);
      });
    };

    provider.awareness.on("change", handler);
    return () => provider.awareness.off("change", handler);
  }, [provider, dispatch]);

  const filtered = query.trim()
    ? docs.filter((d: any) =>
        (d.title || d.fileName || "").toLowerCase().includes(query.toLowerCase())
      )
    : docs;

  const allSelected = docs.length > 0 && docs.every((d: any) => docIds.includes(d._id));
  const someSelected = docIds.length > 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      docs.forEach((d: any) => { if (docIds.includes(d._id)) dispatch(addDocIds(d._id)); });
    } else {
      docs.forEach((d: any) => { if (!docIds.includes(d._id)) dispatch(addDocIds(d._id)); });
    }
  }, [docs, docIds, allSelected, dispatch]);

  const openSource = useCallback((doc: any) => {
    const url = getSourceUrl(doc);
    if (!url) return;
    const sourceType = doc.source_type || null;
    sessionStorage.setItem("nexusai_viewPdf", url);
    sessionStorage.setItem("nexusai_viewSourceType", sourceType ?? "");
    dispatch(viewPdf(url));
    dispatch(setViewSourceType(sourceType));
    // Broadcast to all peers so they see the same source
    provider?.awareness.setLocalStateField("viewingSource", { fileUrl: url, sourceType });
  }, [dispatch, provider]);

  return (
    <div className="relative flex h-full shrink-0">
      {/* Collapsed reopen handle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute left-0 top-5 z-10 flex h-7 w-5 items-center justify-center rounded-r border border-l-0 bg-background shadow-sm hover:bg-muted transition-colors"
          title="Show sources"
        >
          <PanelLeftOpen size={13} className="text-muted-foreground" />
        </button>
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-background transition-all duration-200 ease-in-out overflow-hidden",
          open ? "w-64 opacity-100" : "w-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex h-full flex-col">

          {/* ══ TOP BAR ══ */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
            <span className="text-xs font-semibold text-foreground tracking-wide">Library</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => dispatch(toggleAddSourceModal())}
                title="Add source"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--l-moss)] hover:bg-[var(--l-tint)] transition-colors"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                title="Collapse"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>

          {/* ══ SOURCES SECTION (top half) ══ */}
          <div className="flex flex-col flex-1 min-h-0 border-b border-border">
            {/* Section label */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <FileText size={11} className="text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sources</span>
                {docs.length > 0 && (
                  <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                    {someSelected ? `${docIds.length}/${docs.length}` : docs.length}
                  </span>
                )}
              </div>
              {docs.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allSelected
                    ? <CheckSquare size={10} className="text-[var(--l-moss)]" />
                    : <Square size={10} />
                  }
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {/* Search */}
            <div className="px-2.5 pb-1.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sources…"
                  className="pl-7 h-7 text-xs bg-muted/40 border-0 ring-1 ring-border focus-visible:ring-[var(--l-moss)] rounded-lg"
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
              {loading ? (
                <SourceSkeleton />
              ) : filtered.length === 0 ? (
                <EmptyState onAdd={() => dispatch(toggleAddSourceModal())} hasQuery={!!query} />
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((doc: any) => (
                    <SourceRow
                      key={doc._id}
                      doc={doc}
                      selected={docIds.includes(doc._id)}
                      onToggle={() => dispatch(addDocIds(doc._id))}
                      onOpen={() => openSource(doc)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Add source footer */}
            <div className="px-2.5 py-2 shrink-0">
              <button
                onClick={() => dispatch(toggleAddSourceModal())}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:border-[var(--l-moss)] hover:text-[var(--l-moss)] hover:bg-[var(--l-tint)] transition-all"
              >
                <Plus size={11} />
                Add source
              </button>
            </div>
          </div>

          {/* ══ REPORTS SECTION (bottom half) ══ */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Section label */}
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 shrink-0">
              <BarChart2 size={11} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reports</span>
              {(sources?.length ?? 0) > 0 && (
                <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                  {sources.length}
                </span>
              )}
            </div>

            {/* Scrollable reports */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ReportList sources={(sources ?? []) as reportDataType[]} loading={loading} />
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}

// ── Source row ──────────────────────────────────────────────────────────────

function SourceRow({
  doc,
  selected,
  onToggle,
  onOpen,
}: {
  doc: any;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all",
        selected
          ? "bg-[var(--l-tint)] ring-1 ring-[var(--l-moss)]/30"
          : "hover:bg-muted"
      )}
      onClick={onOpen}
    >
      {/* Checkbox toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        title={selected ? "Remove from selection" : "Select for AI context"}
        className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--l-tint)] transition-colors"
      >
        {selected
          ? <CheckSquare size={13} className="text-[var(--l-moss)]" />
          : <Square size={13} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        }
      </button>

      {/* Type icon */}
      <SourceTypeIcon source_type={doc.source_type} fileName={doc.fileName} />

      {/* Name — click to open in panel */}
      <span
        className={cn(
          "flex-1 text-left text-xs truncate min-w-0 transition-colors",
          selected
            ? "text-[var(--l-moss)] font-medium"
            : "text-foreground"
        )}
        title={doc.title || doc.fileName || "Open source"}
      >
        {doc.title || doc.fileName || "Untitled"}
      </span>
    </div>
  );
}

// ── Source type icon ─────────────────────────────────────────────────────────

function SourceTypeIcon({ source_type, fileName }: { source_type?: string; fileName?: string }) {
  const type = (source_type || fileName || "").toLowerCase();

  let icon = "/icons/text.png";
  if (type.includes("youtube"))                                                    icon = "/icons/youtube.png";
  else if (type.includes("weblink"))                                               icon = "/icons/web.png";
  else if (type.includes(".pptx") || type.includes(".ppt") || type.includes(".ppsx") || type.includes("pptm")) icon = "/icons/powerpoint.png";
  else if (type.includes("doc") || type.includes("docx"))                         icon = "/icons/doc.png";
  else if (type.includes("pdf") || fileName?.toLowerCase().includes(".pdf"))      icon = "/icons/pdf.png";

  return (
    <div className="relative flex-shrink-0 w-4 h-4">
      <Image src={icon} alt={source_type || "source"} fill className="object-contain" sizes="16px" />
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SourceSkeleton() {
  return (
    <div className="space-y-1 px-1 pt-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-lg animate-pulse">
          <div className="w-3.5 h-3.5 rounded bg-muted flex-shrink-0" />
          <div className="w-4 h-4 rounded bg-muted flex-shrink-0" />
          <div className="flex-1 h-3 rounded bg-muted" style={{ width: `${55 + (i % 4) * 10}%` }} />
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd, hasQuery }: { onAdd: () => void; hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
        <p className="text-xs text-muted-foreground">No sources match your search</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-[var(--l-tint)] flex items-center justify-center">
        <FileText size={18} className="text-[var(--l-moss)]" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">No sources yet</p>
        <p className="text-[11px] text-muted-foreground">Add PDFs, docs, or links to get started</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-lg bg-[var(--l-moss)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--l-moss2)] transition-colors"
      >
        <Plus size={12} />
        Add source
      </button>
    </div>
  );
}
