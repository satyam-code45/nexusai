"use client";

import { useState, useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { FileText, ChevronRight, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { pushNavPage, fetchDocuments } from "@/store/aiEditorSlice";
import { makeHttpReq } from "@/lib/helper/makeHttpReq";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { showError } from "@/lib/utils";
import type { UserDocument } from "@/lib/api/projects";

export function PageBlockView({ node, updateAttributes }: NodeViewProps) {
  const { docId, title } = node.attrs as { docId: string; title: string };
  const [inputTitle, setInputTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { selectedDocument } = useSelector((state: RootState) => state.aiEditor);

  const isNew = !docId;

  useEffect(() => {
    if (isNew) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isNew]);

  const createPage = async () => {
    const trimmed = inputTitle.trim();
    if (!trimmed || !userId || !projectId) return;
    try {
      setCreating(true);
      const res = await makeHttpReq("POST", "documents", {
        title: trimmed,
        description: `Sub-page of ${selectedDocument?.title || "document"}`,
        userId,
        projectId,
        parentId: selectedDocument?._id || null,
      }) as { message: string; newRow: UserDocument };

      const newDoc = res.newRow;
      updateAttributes({ docId: newDoc._id, title: newDoc.title });
      dispatch(fetchDocuments({ projectId, userId }));
    } catch (err: any) {
      showError(err?.message ?? "Failed to create page");
    } finally {
      setCreating(false);
    }
  };

  const [navigating, setNavigating] = useState(false);

  const navigate = async () => {
    if (!docId || navigating) return;
    try {
      setNavigating(true);
      // Fetch full content before navigating so the editor isn't empty
      const data = await makeHttpReq("GET", `documents/single-doc?docId=${docId}`) as { document: UserDocument };
      dispatch(pushNavPage(data.document));
      router.push(`?doc=${docId}`);
    } catch {
      showError("Failed to load page");
    } finally {
      setNavigating(false);
    }
  };

  if (isNew) {
    return (
      <NodeViewWrapper>
        <div className="pb-new flex items-center gap-2 my-1 px-3 py-2 rounded-md border border-dashed border-border bg-muted/40">
          <FileText size={15} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={inputTitle}
            onChange={e => setInputTitle(e.target.value)}
            placeholder="Page title…"
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); createPage(); }
              e.stopPropagation();
            }}
            disabled={creating}
          />
          {creating && <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <button
        onClick={navigate}
        disabled={navigating}
        className="pb-block group flex items-center gap-2 w-full my-1 px-3 py-2.5 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors text-left disabled:opacity-60"
      >
        {navigating
          ? <Loader2 size={15} className="shrink-0 text-muted-foreground animate-spin" />
          : <FileText size={15} className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        }
        <span className="flex-1 text-sm font-medium text-foreground truncate">
          {title || "Untitled"}
        </span>
        <ChevronRight
          size={14}
          className="shrink-0 text-border group-hover:text-muted-foreground transition-colors"
        />
      </button>
    </NodeViewWrapper>
  );
}
