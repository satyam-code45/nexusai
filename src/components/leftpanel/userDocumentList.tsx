"use client";

import { useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { updateDocumentContent } from "@/store/aiEditorSlice";
import { makeHttpReq } from "@/lib/helper/makeHttpReq";
import { showError } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserDocument } from "@/lib/api/projects";

type DocTreeNode = UserDocument & { children: DocTreeNode[] };

function buildTree(docs: UserDocument[], parentId: string | null | undefined = null): DocTreeNode[] {
  return docs
    .filter(d => (d.parentId ?? null) === (parentId ?? null))
    .map(d => ({ ...d, children: buildTree(docs, d._id) }));
}

function DocTreeItem({
  node,
  depth,
  onNavigate,
}: {
  node: DocTreeNode;
  depth: number;
  onNavigate: (doc: UserDocument) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { selectedDocument } = useSelector((state: RootState) => state.aiEditor);
  const isActive = selectedDocument._id === node._id;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md mb-0.5 pr-2 text-sm transition-colors",
          isActive
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
            : "text-foreground hover:bg-muted"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-opacity",
            hasChildren ? "opacity-60 hover:opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight
            size={12}
            className={cn("transition-transform duration-150", expanded && "rotate-90")}
          />
        </button>

        {/* Page icon + title */}
        <button
          onClick={() => onNavigate(node)}
          className="flex flex-1 min-w-0 items-center gap-1.5 py-1.5"
        >
          <FileText size={13} className="shrink-0 opacity-60" />
          <span className="truncate text-xs font-medium">{node.title || "Untitled"}</span>
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && node.children.map(child => (
        <DocTreeItem key={child._id} node={child} depth={depth + 1} onNavigate={onNavigate} />
      ))}
    </>
  );
}

const UserDocumentList = ({ userDocuments }: { userDocuments: UserDocument[] }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const tree = buildTree(userDocuments);

  const handleNavigate = async (doc: UserDocument) => {
    try {
      const data = await makeHttpReq("GET", `documents/single-doc?docId=${doc._id}`) as { document: UserDocument };
      dispatch(updateDocumentContent(data.document));
      router.push(`?doc=${doc._id}`);
    } catch {
      showError("Failed to load document");
    }
  };

  if (tree.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-xs text-muted-foreground/50">
        No pages yet. Create one with the <strong>New</strong> button.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {tree.map(node => (
        <DocTreeItem key={node._id} node={node} depth={0} onNavigate={handleNavigate} />
      ))}
    </div>
  );
};

export default UserDocumentList;
