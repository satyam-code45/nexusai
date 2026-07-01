"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Loader2, ZoomIn, ZoomOut, Scissors, BookOpen, AlignJustify,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  FileUp, FilePlus, MessageSquare,
} from "lucide-react";
import { useSnippingTool } from "./useSnippingTool";
import { AppDispatch, RootState } from "@/store";
import { useDispatch, useSelector } from "react-redux";
import { setSnippingFile } from "@/store/chatSlice";
import { viewPdf, addDocIds } from "@/store/docSlice";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { useEditorCollab } from "@/contexts/EditorCollabContext";
import { PDFThumbnails } from "./PDFThumbnails";
import { cn } from "@/lib/utils";
import Image from "next/image";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url?: string;
  title?: string;
  sourceType?: string;
  editorSlot?: React.ReactNode;
  onPdfError?: () => void;
}

const ToolBtn = ({
  onClick, title, active, disabled, children,
}: {
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={cn(
      "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-all",
      active
        ? "bg-[var(--l-moss)] text-white shadow-sm"
        : "text-muted-foreground hover:bg-muted",
      disabled && "cursor-not-allowed opacity-40"
    )}
  >
    {children}
  </button>
);

// ── PDF Picker (shown when PDF tab active but no URL selected) ───────────────
function PDFPicker() {
  const dispatch = useDispatch<AppDispatch>();
  const docs = useSelector((s: RootState) => s.doc.docs) as any[];
  const { provider } = useEditorCollab();

  const pdfs = docs.filter(
    (d) =>
      d.source_type?.toLowerCase().includes("pdf") ||
      d.fileName?.toLowerCase().includes(".pdf")
  );

  function selectPdf(doc: any) {
    const pdfSrc =
      doc.fileUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL}/uploads/${doc.fileName}`;
    const sourceType = doc.source_type || "pdf";
    sessionStorage.setItem("nexusai_viewPdf", pdfSrc);
    sessionStorage.setItem("nexusai_viewSourceType", sourceType);
    dispatch(viewPdf(pdfSrc));
    provider?.awareness.setLocalStateField("viewingSource", { fileUrl: pdfSrc, sourceType });
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--l-bg)",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--l-ink)", margin: 0 }}>
            Choose a source
          </h3>
          <p style={{ fontSize: 12, color: "var(--l-ink3)", marginTop: 3 }}>
            Select a PDF from your project or upload a new file
          </p>
        </div>
        <button
          onClick={() => dispatch(toggleAddSourceModal())}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8,
            background: "var(--l-moss)", border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          <FileUp size={13} /> Upload source
        </button>
      </div>

      {/* Grid */}
      {pdfs.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {pdfs.map((doc) => (
            <button
              key={doc._id}
              onClick={() => selectPdf(doc)}
              style={{
                background: "var(--l-sf)",
                border: "1px solid var(--l-br)",
                borderRadius: 10,
                padding: "14px 12px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 9,
                textAlign: "center",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--l-moss)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(58,90,60,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--l-br)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div style={{ position: "relative", width: 32, height: 32 }}>
                <Image src="/icons/pdf.png" alt="PDF" fill className="object-contain" sizes="32px" />
              </div>
              <span
                style={{
                  fontSize: 12, fontWeight: 500, color: "var(--l-ink)",
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  wordBreak: "break-word",
                }}
              >
                {doc.title || doc.fileName}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "32px 20px",
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: 14,
              background: "var(--l-tint)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <FilePlus size={24} style={{ color: "var(--l-moss)" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--l-ink)", margin: 0 }}>
              No sources open yet
            </p>
            <p style={{ fontSize: 12, color: "var(--l-ink3)", marginTop: 4 }}>
              Click a source on the left to open it here
            </p>
          </div>
          <button
            onClick={() => dispatch(toggleAddSourceModal())}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 20px", borderRadius: 9,
              background: "var(--l-moss)", border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileUp size={14} /> Add a source
          </button>
        </div>
      )}
    </div>
  );
}

// ── Render-mode helpers ───────────────────────────────────────────────────────

type RenderMode = "pdf" | "transcript" | "weblink";

const PDF_TYPES = ["pdf", "doc", "docx", "pptx", "ppt", "ppsx", "pptm"];
const TEXT_TYPES = ["youtube", "weblink", "text", "txt"];

function getRenderMode(sourceType?: string, url?: string): RenderMode {
  if (sourceType) {
    const t = sourceType.toLowerCase();
    if (TEXT_TYPES.some((tt) => t.includes(tt))) return "transcript";
    if (PDF_TYPES.some((pt) => t.includes(pt))) return "pdf";
  }
  // Fall back to URL heuristics only when no sourceType — avoid matching proxy path
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "transcript";
    if (lower.endsWith(".pdf")) return "pdf";
  }
  return "pdf"; // default for unknown types
}

// ── Transcript / text viewer ──────────────────────────────────────────────────
function TranscriptViewer({ url, title, sourceType }: { url: string; title?: string; sourceType?: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setText(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then(setText)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url]);

  const isYoutube = sourceType?.toLowerCase().includes("youtube");

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 min-h-0">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-[var(--l-moss)]/20" />
          <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
        </div>
        <p className="text-xs text-muted-foreground">
          {isYoutube ? "Loading transcript…" : "Loading content…"}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-0 px-6 text-center">
        <p className="text-sm font-medium text-foreground">Could not load content</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Transcript header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
        {isYoutube && (
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-red-500">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
          </div>
        )}
        <span className="text-xs font-medium text-foreground truncate">
          {isYoutube ? "Video Transcript" : title || "Source Content"}
        </span>
        <span className="ml-auto flex-shrink-0 text-[10px] text-muted-foreground tabular-nums">
          {text ? `${text.split(/\s+/).filter(Boolean).length.toLocaleString()} words` : ""}
        </span>
      </div>
      {/* Scrollable text */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-sm leading-7 text-foreground whitespace-pre-wrap font-['Georgia',serif]">
          {text}
        </p>
      </div>
    </div>
  );
}

// ── Main viewer ───────────────────────────────────────────────────────────────
const PDFViewer = memo(function PDFViewer({ url, title = "Document", sourceType, editorSlot, onPdfError }: PDFViewerProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "editor">(url ? "pdf" : "editor");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [showThumbs, setShowThumbs] = useState(true);
  const [scrollMode, setScrollMode] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const {
    onMouseDown, onMouseMove, onMouseUp,
    pdfWrapperRef,
    setSnipMode, snipMode,
    rect, blob,
    loading: creatingImageLoading,
  } = useSnippingTool();

  const dispatch = useDispatch<AppDispatch>();
  const { docs, docIds, viewPdf: viewedUrl } = useSelector((state: RootState) => state.doc);
  // Find the doc in the store whose fileUrl matches what's currently open in the viewer
  const currentDoc = (docs as any[]).find((d) => d.fileUrl === viewedUrl);
  const isSelectedForChat = currentDoc ? docIds.includes(currentDoc._id) : false;

  useEffect(() => { dispatch(setSnippingFile(blob)); }, [blob]);

  // Switch to PDF tab when a URL arrives
  useEffect(() => { if (url) setActiveTab("pdf"); }, [url]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function onDocumentLoadError(error: Error) {
    console.error("[PDFViewer] failed to load PDF:", error.message);
    setActiveTab("editor");
    onPdfError?.();
  }

  function goToPage(page: number) {
    const next = Math.max(1, Math.min(numPages ?? 1, page));
    setPageNumber(next);
    if (scrollMode) {
      pageRefs.current[next - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const zoomPct = Math.round(zoom * 100);
  const isPdf = activeTab === "pdf";
  const renderMode = getRenderMode(sourceType, url);
  const showPdfRenderer = renderMode === "pdf";

  return (
    <div className="flex h-full w-full bg-background">

      {/* Thumbnail sidebar — only when showing an actual PDF */}
      {isPdf && url && showThumbs && numPages && showPdfRenderer && (
        <div className="w-36 flex-shrink-0 overflow-y-auto border-r border-border bg-muted/30">
          <PDFThumbnails
            url={url}
            numPages={numPages}
            pageNumber={pageNumber}
            onSelect={goToPage}
          />
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Title bar with tabs */}
        <div className="flex h-10 flex-shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-2">
          {isPdf && url && showPdfRenderer && (
            <button
              onClick={() => setShowThumbs((p) => !p)}
              title="Toggle thumbnails"
              className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
            >
              {showThumbs ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
          )}

          {isPdf && url ? (
            <span className="flex-1 truncate text-xs font-medium text-foreground px-1 min-w-0">
              {title}
            </span>
          ) : (
            <span className="flex-1" />
          )}

          {/* Chat-context toggle — only when a doc is open */}
          {url && currentDoc && (
            <button
              onClick={() => dispatch(addDocIds(currentDoc._id))}
              title={isSelectedForChat ? "Remove from chat context" : "Use this source in chat"}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all flex-shrink-0 mr-1",
                isSelectedForChat
                  ? "bg-[var(--l-tint)] text-[var(--l-moss)]"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <MessageSquare size={11} />
              <span>{isSelectedForChat ? "In chat" : "Chat"}</span>
            </button>
          )}

          {/* Tab pills — PDF tab never disabled */}
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab("pdf")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                activeTab === "pdf"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Source
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                activeTab === "editor"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Editor
            </button>
          </div>
        </div>

        {/* Editor view */}
        {activeTab === "editor" && (
          <div className="flex-1 overflow-hidden">
            {editorSlot ?? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Editor
              </div>
            )}
          </div>
        )}

        {/* Source view */}
        {activeTab === "pdf" && (
          !url ? (
            <PDFPicker />
          ) : renderMode === "transcript" ? (
            <TranscriptViewer url={url} title={title} sourceType={sourceType} />
          ) : (
            <div className="relative flex flex-1 min-w-0 min-h-0">
              {/* Scroll area */}
              <div
                ref={pdfWrapperRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                className="relative flex-1 overflow-auto bg-muted/20 select-none"
              >
                <div style={{ width: "max-content", minWidth: "100%", padding: "24px", boxSizing: "border-box" }}>
                  <div style={{ margin: "0 auto", width: "max-content" }}>
                    <Document
                      file={url}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="flex h-48 items-center justify-center gap-3">
                          <div className="relative h-8 w-8">
                            <div className="absolute inset-0 rounded-full border-2 border-[var(--l-moss)]/20" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
                          </div>
                          <span className="text-xs text-muted-foreground">Loading document…</span>
                        </div>
                      }
                    >
                      {numPages && (
                        scrollMode
                          ? Array.from({ length: numPages }, (_, i) => (
                              <div key={i} ref={(el) => { pageRefs.current[i] = el; }} className="mb-6">
                                <Page pageNumber={i + 1} scale={zoom} renderTextLayer renderAnnotationLayer className="shadow-lg rounded" />
                              </div>
                            ))
                          : <Page pageNumber={pageNumber} scale={zoom} renderTextLayer renderAnnotationLayer className="shadow-lg rounded" />
                      )}
                    </Document>
                  </div>
                </div>

                {/* Snip overlay */}
                {snipMode && rect && (
                  <div
                    className="absolute border-2 border-[var(--l-moss)] border-dashed bg-[var(--l-moss)]/10 pointer-events-none z-50"
                    style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                  />
                )}
              </div>

              {/* Page nav */}
              {!scrollMode && numPages && numPages > 1 && (
                <div className="absolute bottom-4 right-14 z-10 flex items-center gap-2 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5">
                  <button
                    onClick={() => goToPage(pageNumber - 1)}
                    disabled={pageNumber <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground select-none min-w-[3rem] text-center">
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    onClick={() => goToPage(pageNumber + 1)}
                    disabled={pageNumber >= numPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Right toolbar */}
              <div className="flex w-12 flex-shrink-0 flex-col items-center gap-1 border-l border-border bg-muted/30 py-3">
                <ToolBtn onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} title="Zoom in">
                  <ZoomIn size={17} />
                </ToolBtn>
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground leading-tight">
                  {zoomPct}%
                </span>
                <ToolBtn onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.2).toFixed(1)))} title="Zoom out">
                  <ZoomOut size={17} />
                </ToolBtn>
                <div className="my-1 h-px w-6 bg-border" />
                <ToolBtn
                  onClick={() => setScrollMode((p) => !p)}
                  active={scrollMode}
                  title={scrollMode ? "Single page mode" : "Scroll mode"}
                >
                  {scrollMode ? <BookOpen size={17} /> : <AlignJustify size={17} />}
                </ToolBtn>
                <ToolBtn
                  onClick={() => setSnipMode(true)}
                  active={snipMode}
                  disabled={creatingImageLoading}
                  title="Snip a region"
                >
                  {creatingImageLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Scissors size={15} />}
                </ToolBtn>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
});

export default PDFViewer;
