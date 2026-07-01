"use client"

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { PageBlock } from './extensions/PageBlock';
import { Video } from './extensions/Video';
import { UploadPlaceholder } from './extensions/UploadPlaceholder';
import { Breadcrumb } from './Breadcrumb';
import { TableOfContent } from './TableOfContent';
import { getHierarchicalIndexes, TableOfContents, TableOfContentDataItem } from '@tiptap/extension-table-of-contents';
import { FloatingMenu } from './foatingMenu/FloatingMenu';
import { getMenuPosition, useSelection } from './hook/useSelection';
import { handleCommand } from './foatingMenu/handleCommand';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { Rephrase } from './extensions/Rephrase';
import { Autocomplete } from './extensions/Autocomplete';
import { Translate } from './extensions/Translate';
import { CursorPosition } from './extensions/CursorPosition';
import { trackCursorPosition } from '@/store/aiEditorSlice';
import Collaboration from '@tiptap/extension-collaboration';
import { EditorToolbar } from './EditorToolbar';
import * as Y from "yjs";
import { WebsocketProvider } from 'y-websocket';
import { CodeBlockView } from './CodeBlockView';
import { SlashCommandList, SlashCommand, SlashCommandListHandle } from './SlashCommandList';
import { makeHttpReq } from '@/lib/helper/makeHttpReq';
import { showError, showSuccess } from '@/lib/utils';
import { CheckCircle, Loader2 as SpinnerIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TofC = React.memo(TableOfContent);

const lowlight = createLowlight(common);
const CustomCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        parseHTML: el => el.getAttribute("data-caption") ?? "",
        renderHTML: attrs => attrs.caption ? { "data-caption": attrs.caption } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!this.editor.isActive("codeBlock")) return false;
        this.editor.commands.insertContent("  ");
        return true;
      },
    };
  },
}).configure({ lowlight });

interface SlashMenuState {
  x: number;
  y: number;
  query: string;
  from: number;
  to: number;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 500;

const Editor = ({
  initialHtml,
  initialTiptapJson,
  initialTitle,
  projectId,
  workspaceKey,
  ydoc,
  provider,
  readOnly = false,
}: {
  initialHtml: string;
  initialTiptapJson: object | null;
  initialTitle: string;
  projectId: string;
  workspaceKey: string;
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  readOnly?: boolean;
}) => {
  const { showTableofContent } = useSelector((state: RootState) => state.editor);
  const { autocomplete } = useSelector((state: RootState) => state.aiEditor);

  const editorRef = useRef<any>(null);
  const [items, setItems] = useState<TableOfContentDataItem[]>([]);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hasGhostText, setHasGhostText] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  // ── Collaborative title via Yjs ────────────────────────────────────────────
  // Y.Text('title') is synced to all collaborators over WebSocket.
  // We seed it from the DB value on first load (when Yjs has nothing yet).
  const yTitle = useMemo(() => ydoc.getText('title'), [ydoc]);

  const titleSeed = (!initialTitle || initialTitle === "Untitled") ? "" : initialTitle;
  const [docTitle, setDocTitle] = useState(() => yTitle.toString() || titleSeed);
  const docTitleRef = useRef(docTitle);
  useEffect(() => { docTitleRef.current = docTitle; }, [docTitle]);

  useEffect(() => {
    // Keep local React state in sync with remote Yjs changes
    const observer = () => setDocTitle(yTitle.toString());
    yTitle.observe(observer);

    if (yTitle.length > 0) {
      // ydoc was pre-populated — title is already present, show it immediately.
      // WS sync will merge any newer remote edits via the observer above.
      setDocTitle(yTitle.toString());
      return () => yTitle.unobserve(observer);
    }

    // ydoc is empty (brand-new doc, no saved yjsState yet).
    // Wait for WS sync before seeding so we don't race with a server that has
    // existing content: seed-before-sync → merge → doubled title.
    const maybeSeed = () => {
      if (yTitle.length === 0 && titleSeed) {
        ydoc.transact(() => { yTitle.insert(0, titleSeed); });
      } else if (yTitle.length > 0) {
        setDocTitle(yTitle.toString());
      }
    };

    if (!provider || (provider as any).synced) {
      maybeSeed();
      return () => yTitle.unobserve(observer);
    }

    let resolved = false;
    const onSync = (isSynced: boolean) => {
      if (!isSynced || resolved) return;
      resolved = true;
      provider.off('sync', onSync);
      maybeSeed();
    };
    provider.on('sync', onSync);
    // Safety: seed after 3s even if WS never fires (fully offline scenario)
    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      provider.off('sync', onSync);
      maybeSeed();
    }, 3000);

    return () => {
      yTitle.unobserve(observer);
      clearTimeout(timer);
      provider.off('sync', onSync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yTitle, ydoc]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    ydoc.transact(() => {
      yTitle.delete(0, yTitle.length);
      if (next) yTitle.insert(0, next);
    });
    // setDocTitle is driven by the observer above; also update ref immediately
    docTitleRef.current = next;
  }, [yTitle, ydoc]);

  const { selectionRect, isSelectionActive } = useSelection(editorRef);
  const selectionMenuPos = isSelectionActive && selectionRect
    ? getMenuPosition(selectionRect)
    : { top: 0, left: 0 };

  // ── Slash command state ────────────────────────────────────────────────────
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const slashOpenRef = useRef(false);
  const slashMenuRef = useRef<SlashCommandListHandle | null>(null);

  // File inputs for image and video
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Stable ref so TipTap editorProps (created once) can call the latest handler
  const handleImageFileRef = useRef<((f: File) => Promise<void>) | null>(null);
  const handleVideoFileRef = useRef<((f: File) => Promise<void>) | null>(null);

  // ── Autosave ───────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent autosave from firing right after initial content load
  const skipAutosaveRef = useRef(false);
  // Tracks whether there are changes not yet flushed to DB
  const dirtyRef = useRef(false);

  const headingEnterExt = useMemo(
    () =>
      Extension.create({
        name: 'headingEnter',
        priority: 900,
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              if (!this.editor.isActive('heading')) return false;
              return this.editor.chain().splitBlock().setParagraph().run();
            },
          };
        },
      }),
    []
  );

  const slashKeyboardExt = useMemo(
    () =>
      Extension.create({
        name: 'slashKeyboard',
        priority: 1000,
        addKeyboardShortcuts() {
          return {
            ArrowDown: () => {
              if (!slashOpenRef.current) return false;
              slashMenuRef.current?.navigate(1);
              return true;
            },
            ArrowUp: () => {
              if (!slashOpenRef.current) return false;
              slashMenuRef.current?.navigate(-1);
              return true;
            },
            Enter: () => {
              if (!slashOpenRef.current) return false;
              slashMenuRef.current?.select();
              return true;
            },
            Escape: () => {
              if (!slashOpenRef.current) return false;
              slashOpenRef.current = false;
              setSlashMenu(null);
              return true;
            },
          };
        },
      }),
    []
  );

  // ── Editor instance ────────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      Collaboration.configure({ document: ydoc }),
      // undoRedo: false — Collaboration provides its own history; StarterKit's UndoRedo conflicts
      // link/underline configured here instead of separate imports (StarterKit v3 includes them)
      StarterKit.configure({
        codeBlock: false,
        undoRedo: false,
        link: { openOnClick: false, autolink: true },
      }),
      CustomCodeBlock,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing…",
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount,
      Image,
      Video,
      UploadPlaceholder,
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        onUpdate(c) { setItems(c); },
      }),
      PageBlock,
      Rephrase,
      Autocomplete.configure({
        pauseDuration: 3000,
        suggestion: ' Prompt engineering, at its core, involves the deliberate design and refinement of textual inputs to guide (Singh et al., 2024).',
      }),
      Translate,
      CursorPosition.configure({ onUpdate: setCursor }),
      headingEnterExt,
      slashKeyboardExt,
    ],
    editorProps: {
      handleDrop(_, event) {
        const files = Array.from(event.dataTransfer?.files ?? []);
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        const videoFiles = files.filter((f) => f.type.startsWith("video/"));
        if (imageFiles.length === 0 && videoFiles.length === 0) return false;
        event.preventDefault();
        imageFiles.forEach((f) => handleImageFileRef.current?.(f));
        videoFiles.forEach((f) => handleVideoFileRef.current?.(f));
        return true;
      },
      handlePaste(_, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((i) => i.type.startsWith("image/"));
        if (!imageItem) return false;
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (file) handleImageFileRef.current?.(file);
        return true;
      },
    },
  });

  // ── Core save function (used by autosave + toolbar manual save) ────────────
  const performSave = useCallback(async (opts?: { showToast?: boolean }) => {
    if (!projectId || !editor) {
      console.warn(`[Editor] performSave skipped — projectId=${projectId} editor=${!!editor}`);
      return;
    }
    const html = editor.getHTML();
    const isEmpty = editor.isEmpty;

    // Manual save: warn the user but don't proceed — nothing meaningful to save yet
    if (isEmpty && opts?.showToast) {
      showError("Nothing to save yet — write something first");
      return;
    }

    const tiptapJson = isEmpty ? null : editor.getJSON();
    console.log(`[Editor] saving — key="${workspaceKey}" projectId=${projectId} htmlLen=${html?.length ?? 0} empty=${isEmpty}`);
    setSaveStatus("saving");
    try {
      const data = await makeHttpReq("POST", "workspace/save", {
        workspaceKey,
        projectId,
        title: docTitleRef.current,
        tiptapJson,
        html: isEmpty ? '' : html,
      }) as { message: string };
      setSaveStatus("saved");
      dirtyRef.current = false;
      console.log(`[Editor] save OK:`, data?.message);
      if (opts?.showToast) showSuccess(data?.message ?? "Saved!");
      clearTimeout(savedTimerRef.current!);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      setSaveStatus("error");
      console.error(`[Editor] save FAILED — projectId=${projectId}:`, err?.message ?? err);
      if (opts?.showToast) showError(err?.message ?? "Failed to save");
    }
  }, [projectId, workspaceKey, editor]);

  // ── Autosave on editor content change ─────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const scheduleAutosave = () => {
      if (skipAutosaveRef.current) return;
      dirtyRef.current = true;
      clearTimeout(autosaveTimerRef.current!);
      autosaveTimerRef.current = setTimeout(() => {
        performSave();
      }, AUTOSAVE_DELAY_MS);
    };

    editor.on('update', scheduleAutosave);
    return () => {
      editor.off('update', scheduleAutosave);
      clearTimeout(autosaveTimerRef.current!);
      clearTimeout(savedTimerRef.current!);
    };
  }, [editor, performSave]);

  // ── Flush pending save when leaving the page ───────────────────────────────
  // navigator.sendBeacon is fire-and-forget and is guaranteed to be sent even
  // when the tab is closing — unlike fetch() which can be aborted mid-flight.
  // We also flush on visibilitychange (tab switch / minimize) for extra safety.
  useEffect(() => {
    if (!editor || !projectId) return;

    const flushNow = () => {
      if (!dirtyRef.current || skipAutosaveRef.current) return;
      clearTimeout(autosaveTimerRef.current!);
      const html = editor.getHTML();
      const isEmpty = editor.isEmpty;
      const payload = JSON.stringify({
        workspaceKey,
        projectId,
        title: docTitleRef.current,
        tiptapJson: isEmpty ? null : editor.getJSON(),
        html: isEmpty ? '' : html,
      });
      // sendBeacon includes cookies (same-origin) so withAuth middleware works
      navigator.sendBeacon(
        '/api/workspace/save',
        new Blob([payload], { type: 'application/json' })
      );
      dirtyRef.current = false;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };

    window.addEventListener('beforeunload', flushNow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', flushNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [editor, projectId, workspaceKey]);

  // ── Placeholder helpers ────────────────────────────────────────────────────
  const replacePlaceholderWithNode = useCallback(
    (uploadId: string, nodeType: string, attrs: Record<string, any>) => {
      if (!editor) return;
      const { state, view, schema } = editor;
      state.doc.descendants((node, pos) => {
        if (node.type.name === "uploadPlaceholder" && node.attrs.uploadId === uploadId) {
          const replacement = schema.nodes[nodeType].create(attrs);
          view.dispatch(state.tr.replaceWith(pos, pos + node.nodeSize, replacement));
          return false;
        }
      });
    },
    [editor]
  );

  const removePlaceholderNode = useCallback(
    (uploadId: string) => {
      if (!editor) return;
      const { state, view } = editor;
      state.doc.descendants((node, pos) => {
        if (node.type.name === "uploadPlaceholder" && node.attrs.uploadId === uploadId) {
          view.dispatch(state.tr.delete(pos, pos + node.nodeSize));
          return false;
        }
      });
    },
    [editor]
  );

  // ── Image upload handler ───────────────────────────────────────────────────
  const handleImageFile = useCallback(async (file: File) => {
    if (!file || !editor) return;
    const uploadId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewSrc = URL.createObjectURL(file);
    editor.commands.insertUploadPlaceholder({ uploadId, fileName: file.name, mediaType: "image", previewSrc });
    try {
      setUploadingImg(true);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data.image?.fileUrl as string;
      replacePlaceholderWithNode(uploadId, "image", { src: url });
    } catch (err: any) {
      removePlaceholderNode(uploadId);
      showError(err?.message ?? "Image upload failed");
    } finally {
      URL.revokeObjectURL(previewSrc);
      setUploadingImg(false);
    }
  }, [editor, replacePlaceholderWithNode, removePlaceholderNode]);

  // ── Video upload handler ───────────────────────────────────────────────────
  const handleVideoFile = useCallback(async (file: File) => {
    if (!file || !editor) return;
    const uploadId = `vid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    editor.commands.insertUploadPlaceholder({ uploadId, fileName: file.name, mediaType: "video", previewSrc: null });
    try {
      setUploadingVideo(true);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-video", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Upload failed");
      }
      const data = await res.json();
      const url = data.video?.fileUrl as string;
      replacePlaceholderWithNode(uploadId, "video", { src: url });
    } catch (err: any) {
      removePlaceholderNode(uploadId);
      showError(err?.message ?? "Video upload failed");
    } finally {
      setUploadingVideo(false);
    }
  }, [editor, replacePlaceholderWithNode, removePlaceholderNode]);

  // Keep refs in sync so TipTap editorProps (created once on mount) always call the latest handler
  useEffect(() => { handleImageFileRef.current = handleImageFile; }, [handleImageFile]);
  useEffect(() => { handleVideoFileRef.current = handleVideoFile; }, [handleVideoFile]);

  // ── Slash command detection ───────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const detectSlash = () => {
      const { selection } = editor.state;
      const { $from } = selection;

      if ($from.parent.type.name !== 'paragraph') {
        if (slashOpenRef.current) { setSlashMenu(null); slashOpenRef.current = false; }
        return;
      }

      const offset = $from.parentOffset;
      const textBefore = $from.parent.textContent.slice(0, offset);
      const match = textBefore.match(/^\/(\S*)$/);

      if (match) {
        const coords = editor.view.coordsAtPos(selection.from);
        const blockStart = selection.from - offset;
        setSlashMenu({
          x: coords.left,
          y: coords.bottom,
          query: match[1],
          from: blockStart,
          to: selection.from,
        });
        slashOpenRef.current = true;
      } else if (slashOpenRef.current) {
        setSlashMenu(null);
        slashOpenRef.current = false;
      }
    };

    editor.on('update', detectSlash);
    editor.on('selectionUpdate', detectSlash);
    return () => {
      editor.off('update', detectSlash);
      editor.off('selectionUpdate', detectSlash);
    };
  }, [editor]);

  const executeSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      if (!editor || !slashMenu) return;
      editor.chain()
        .focus()
        .deleteRange({ from: slashMenu.from, to: slashMenu.to })
        .run();
      cmd.action(editor);
      setSlashMenu(null);
      slashOpenRef.current = false;
    },
    [editor, slashMenu]
  );

  // ── Misc effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!editor) return;
    const check = () => {
      setHasGhostText(!!(editor.storage as any).autocomplete?.ghostText);
    };
    editor.on('update', check);
    editor.on('selectionUpdate', check);
    return () => {
      editor.off('update', check);
      editor.off('selectionUpdate', check);
    };
  }, [editor]);

  useEffect(() => { dispatch(trackCursorPosition(cursor)); }, [cursor]);

  useEffect(() => {
    if (editor) editor.commands.setAutocomplete(autocomplete);
  }, [autocomplete, editor]);

  // Load initial content once the provider syncs (or immediately if already synced).
  // Wait for the Yjs provider to complete its initial sync first. Only apply the HTML
  // fallback (from MongoDB) if Yjs left the document empty — this avoids the race where
  // an empty Yjs sync-step-2 overwrites content we just set.
  useEffect(() => {
    if (!editor) return;

    // ydoc is pre-populated from the saved Yjs binary state (yjsStateB64) before the
    // editor mounts.  When the ydoc already has content, y-prosemirror's ySyncPlugin
    // skips writing its initial empty paragraph — no race, no stray paragraphs.
    //
    // Cases:
    //   isEmpty = false → ydoc had saved state; editor already shows it.  Done.
    //   isEmpty = true  → brand-new doc (no yjsState yet); apply DB content once.
    skipAutosaveRef.current = true;

    const isEmpty =
      editor.state.doc.textContent.trim() === '' &&
      editor.state.doc.childCount <= 1;

    if (isEmpty) {
      if (initialTiptapJson) {
        editor.commands.setContent(initialTiptapJson);
      } else if (initialHtml && initialHtml.trim() !== '' && initialHtml !== '<p></p>') {
        editor.commands.setContent(initialHtml);
      }
    }

    requestAnimationFrame(() => editor.commands.focus('end'));
    setTimeout(() => { skipAutosaveRef.current = false; }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Autosave title changes with a small debounce
  useEffect(() => {
    if (!projectId || !editor || skipAutosaveRef.current) return;
    dirtyRef.current = true;
    clearTimeout(autosaveTimerRef.current!);
    autosaveTimerRef.current = setTimeout(() => performSave(), AUTOSAVE_DELAY_MS);
  }, [docTitle, performSave, projectId, editor]);

  if (!editor) return null;

  return (
    <div className="flex h-full w-full flex-col" style={{ background: '#F6F5F1' }}>

      {/* ── Read-only banner for room viewers ── */}
      {readOnly && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 py-1.5 px-4 text-xs text-amber-700 dark:text-amber-400">
          <span>👁</span>
          <span>You have <strong>viewer</strong> access to this room — editing is disabled. Contact the room owner to request editor access.</span>
        </div>
      )}

      {/* ── Sticky toolbar ── */}
      <div className="flex-shrink-0 z-10 border-b border-border/70 bg-background shadow-sm">
        <EditorToolbar
          editor={editor}
          provider={provider}
          onImageUpload={readOnly ? undefined : () => imgInputRef.current?.click()}
          onVideoUpload={readOnly ? undefined : () => videoInputRef.current?.click()}
          onSave={readOnly ? undefined : () => performSave({ showToast: true })}
        />
      </div>

      {/* ── Scrollable writing area ── */}
      <div className="flex flex-1 min-h-0 overflow-y-auto items-start bg-[#EAE3D4] dark:bg-[#0F0D09]">

        {/* Paper */}
        <div
          ref={editorRef}
          onClick={() => { if (!editor.isFocused) editor.commands.focus('end'); }}
          className="relative mx-auto mt-8 mb-0 flex-shrink-0 w-full bg-[#FEFCF8] dark:bg-[var(--l-sf)] rounded-t-xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.4)] px-16 pt-10 cursor-text"
          style={{ maxWidth: 820, minHeight: 'calc(100vh - 120px)', paddingBottom: '40vh' }}
        >
          <Breadcrumb />

          {/* Document title — synced via Y.Text('title') over WebSocket */}
          <input
            type="text"
            value={docTitle}
            onChange={handleTitleChange}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                editor.commands.focus('start');
              }
            }}
            placeholder="Untitled"
            className="w-full bg-transparent outline-none border-none mb-6 font-bold text-foreground placeholder:text-muted-foreground/30"
            style={{ fontSize: 36, lineHeight: 1.2, fontFamily: 'inherit' }}
          />

          <FloatingMenu
            isVisible={isSelectionActive && !editor.state.selection.empty}
            position={selectionMenuPos}
            editor={editor}
            mode="selection"
            onExecute={(cmd, value) => handleCommand({ command: cmd, value, editor })}
          />

          <EditorContent
            editor={editor}
            className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
          />
        </div>

        {/* Table of Contents */}
        {showTableofContent && (
          <div className="hidden xl:block w-52 flex-shrink-0 py-8 pr-4">
            <div className="sticky top-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Contents</p>
              <TofC editor={editor} items={items} />
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleVideoFile(f);
          e.target.value = "";
        }}
      />

      {/* ── Slash command dropdown ── */}
      {slashMenu && (
        <SlashCommandList
          ref={slashMenuRef}
          x={slashMenu.x}
          y={slashMenu.y}
          query={slashMenu.query}
          editor={editor}
          onSelect={executeSlashCommand}
          onClose={() => { setSlashMenu(null); slashOpenRef.current = false; }}
          onImageTrigger={() => imgInputRef.current?.click()}
          onVideoTrigger={() => videoInputRef.current?.click()}
        />
      )}

      {/* ── Status bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between border-t border-border bg-background px-5 py-1">
        {/* Left: autocomplete hint */}
        {hasGhostText ? (
          <span className="flex items-center gap-1.5 text-[11px] text-violet-500 dark:text-violet-400 animate-pulse">
            <kbd className="rounded border border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/30 px-1 py-0.5 text-[10px] font-mono font-medium">Tab</kbd>
            to accept autocomplete
            <span className="text-border mx-1">·</span>
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">Any key</kbd>
            to dismiss
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">
            {autocomplete ? "AI autocomplete on — pause typing to see suggestions" : ""}
          </span>
        )}

        {/* Center: upload progress indicators */}
        <div className="flex items-center gap-3">
          {(uploadingImg || uploadingVideo) && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--l-moss)]">
              <SpinnerIcon size={11} className="animate-spin" />
              {uploadingImg ? "Uploading image…" : "Uploading video…"}
            </span>
          )}
        </div>

        {/* Right: autosave status + word/char count */}
        <div className="flex items-center gap-4">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
              <SpinnerIcon size={11} className="animate-spin" />
              Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400">
              <CheckCircle size={11} />
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-[11px] text-red-500">
              <AlertCircle size={11} />
              Save failed
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/50">
            {editor.storage.characterCount.words()} words
          </span>
          <span className="text-[11px] text-muted-foreground/50">
            {editor.storage.characterCount.characters()} chars
          </span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
