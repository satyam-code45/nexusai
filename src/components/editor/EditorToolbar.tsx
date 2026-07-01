"use client";

import {
  Heading1, Heading2, Heading3, Type,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  List, ListOrdered,
  Quote, Code2, Minus,
  ImageIcon, Link as LinkIcon, Table as TableIcon,
  BookOpenText, Save, Loader2,
  Undo2, Redo2,
  ChevronDown,
  Zap, Video,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleTofC } from "@/store/editorSlice";
import { AppDispatch, RootState } from "@/store";
import { showSuccess } from "@/lib/utils";
import { Editor } from "@tiptap/react";
import { WebsocketProvider } from "y-websocket";
import { toggleAutocomplete } from "@/store/aiEditorSlice";
import { InsertLinkMenu } from "./buttons/InsertLinkMenu";
import { InsertTableMenu } from "./buttons/InsertTableMenu";
import { CollaborativeUsers } from "./CollaborativeUsers";
import { cn } from "@/lib/utils";

// ── Block type descriptor ──────────────────────────────────────────────────
const BLOCK_TYPES = [
  { key: "paragraph",  label: "Text",    icon: Type,     cmd: () => (e: Editor) => e.chain().focus().setParagraph().run() },
  { key: "h1",         label: "Heading 1", icon: Heading1, cmd: () => (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run() },
  { key: "h2",         label: "Heading 2", icon: Heading2, cmd: () => (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run() },
  { key: "h3",         label: "Heading 3", icon: Heading3, cmd: () => (e: Editor) => e.chain().focus().setHeading({ level: 3 }).run() },
  { key: "bulletList", label: "Bullet list", icon: List,    cmd: () => (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { key: "orderedList",label: "Numbered list", icon: ListOrdered, cmd: () => (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { key: "blockquote", label: "Quote",    icon: Quote,    cmd: () => (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { key: "codeBlock",  label: "Code",     icon: Code2,    cmd: () => (e: Editor) => e.chain().focus().toggleCodeBlock().run() },
] as const;

function getActiveBlockType(editor: Editor) {
  if (editor.isActive("heading", { level: 1 })) return BLOCK_TYPES[1];
  if (editor.isActive("heading", { level: 2 })) return BLOCK_TYPES[2];
  if (editor.isActive("heading", { level: 3 })) return BLOCK_TYPES[3];
  if (editor.isActive("bulletList"))  return BLOCK_TYPES[4];
  if (editor.isActive("orderedList")) return BLOCK_TYPES[5];
  if (editor.isActive("blockquote"))  return BLOCK_TYPES[6];
  if (editor.isActive("codeBlock"))   return BLOCK_TYPES[7];
  return BLOCK_TYPES[0];
}

// ── Primitive components ───────────────────────────────────────────────────
function TBtn({
  children, onClick, active, disabled, title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all duration-100",
        active
          ? "bg-[var(--l-tint)] text-[var(--l-moss)]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

// ── Block type dropdown ────────────────────────────────────────────────────
function BlockTypeSelector({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = getActiveBlockType(editor);
  const Icon = active.icon;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Icon size={13} />
        <span className="min-w-[52px] text-left">{active.label}</span>
        <ChevronDown size={11} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-border bg-popover shadow-xl z-50 py-1">
          {BLOCK_TYPES.map((bt) => {
            const BIcon = bt.icon;
            const isActive = getActiveBlockType(editor).key === bt.key;
            return (
              <button
                key={bt.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { bt.cmd()(editor); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--l-tint)] text-[var(--l-moss)] font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <BIcon size={14} className="shrink-0 text-muted-foreground" />
                {bt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Highlight colour picker ────────────────────────────────────────────────
const HIGHLIGHTS = [
  { color: "oklch(0.945 0.129 101.54)", bg: "bg-yellow-300", title: "Yellow" },
  { color: "oklch(88.5% 0.062 18.334)", bg: "bg-red-300",    title: "Red" },
  { color: "oklch(0.925 0.084 155.995)", bg: "bg-green-300",  title: "Green" },
  { color: "oklch(0.917 0.08 205.041)",  bg: "bg-cyan-300",   title: "Cyan" },
  { color: "oklch(0.85 0.1 270)",         bg: "bg-purple-300", title: "Purple" },
];

function HighlightPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <TBtn
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => setOpen((v) => !v)}
      >
        <Highlighter size={13} />
      </TBtn>
      {open && (
        <div className="absolute left-0 top-full mt-1 flex gap-1 rounded-lg border border-border bg-popover shadow-xl p-2 z-50">
          {HIGHLIGHTS.map((h) => (
            <button
              key={h.color}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { editor.chain().focus().toggleHighlight({ color: h.color }).run(); setOpen(false); }}
              title={h.title}
              className={cn("h-5 w-5 rounded-full border-2 border-background shadow-sm transition-transform hover:scale-110", h.bg)}
            />
          ))}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { editor.chain().focus().unsetHighlight().run(); setOpen(false); }}
            title="Remove highlight"
            className="h-5 w-5 rounded-full bg-muted border-2 border-background text-muted-foreground text-[9px] flex items-center justify-center hover:scale-110 transition-transform"
          >✕</button>
        </div>
      )}
    </div>
  );
}

// ── Autocomplete pill toggle ───────────────────────────────────────────────
function AutocompleteToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      title="Toggle AI Autocomplete"
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold border transition-all",
        active
          ? "bg-[var(--l-moss)] text-white border-[var(--l-moss)] shadow-sm"
          : "bg-background text-muted-foreground border-border hover:border-[var(--l-moss)] hover:text-[var(--l-moss)]"
      )}
    >
      <Zap size={11} className={active ? "fill-white" : ""} />
      Autocomplete
      {/* mini switch indicator */}
      <span
        className={cn(
          "ml-0.5 inline-flex h-3.5 w-6 items-center rounded-full transition-colors",
          active ? "bg-white/30" : "bg-border"
        )}
      >
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-transform",
            active ? "translate-x-3 bg-white" : "translate-x-0.5 bg-muted-foreground"
          )}
        />
      </span>
    </button>
  );
}

// ── Main toolbar ───────────────────────────────────────────────────────────
export function EditorToolbar({
  editor,
  provider,
  onImageUpload,
  onVideoUpload,
  onSave,
}: {
  editor: Editor;
  provider: WebsocketProvider;
  onImageUpload?: () => void;
  onVideoUpload?: () => void;
  onSave?: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { autocomplete } = useSelector((state: RootState) => state.aiEditor);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try { await onSave(); } finally { setSaving(false); }
  };

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  return (
    <div className="flex h-11 w-full items-center gap-0.5 px-3 overflow-visible">

      {/* Block type */}
      <BlockTypeSelector editor={editor} />
      <Sep />

      {/* Text formatting */}
      <TBtn title="Bold (⌘B)"      active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></TBtn>
      <TBtn title="Italic (⌘I)"    active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></TBtn>
      <TBtn title="Underline (⌘U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></TBtn>
      <TBtn title="Strikethrough"  active={editor.isActive("strike")}    onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></TBtn>
      <HighlightPicker editor={editor} />
      <Sep />

      {/* Lists */}
      <TBtn title="Bullet list"   active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></TBtn>
      <TBtn title="Ordered list"  active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></TBtn>
      <Sep />

      {/* Blocks */}
      <TBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} /></TBtn>
      <TBtn title="Code block" active={editor.isActive("codeBlock")}  onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={14} /></TBtn>
      <TBtn title="Divider"    onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={14} /></TBtn>
      <Sep />

      {/* Insert */}
      <TBtn title="Insert image (upload)" onClick={onImageUpload}>
        <ImageIcon size={14} />
      </TBtn>
      <TBtn title="Insert video (upload)" onClick={onVideoUpload}>
        <Video size={14} />
      </TBtn>
      <InsertLinkMenu editor={editor} />
      <InsertTableMenu editor={editor} />
      <Sep />

      {/* ToC + Save */}
      <TBtn title="Table of contents" onClick={() => dispatch(toggleTofC())}><BookOpenText size={14} /></TBtn>
      <TBtn title="Save document (⌘S)" disabled={saving} onClick={save}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
      </TBtn>
      <Sep />

      {/* Autocomplete toggle — clearly labeled */}
      <AutocompleteToggle active={autocomplete} onToggle={() => dispatch(toggleAutocomplete())} />

      {/* ── right side ── */}
      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        <CollaborativeUsers provider={provider} />
        <Sep />
        <TBtn title="Undo (⌘Z)" disabled={!canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></TBtn>
        <TBtn title="Redo (⌘⇧Z)" disabled={!canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></TBtn>
      </div>
    </div>
  );
}
