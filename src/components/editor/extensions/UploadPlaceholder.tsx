"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Loader2, ImageIcon, Film } from "lucide-react";

// ── React view ────────────────────────────────────────────────────────────────

function UploadPlaceholderView({ node }: NodeViewProps) {
  const { fileName, mediaType, previewSrc } = node.attrs as {
    fileName: string;
    mediaType: "image" | "video";
    previewSrc: string | null;
  };

  const isImage = mediaType === "image";

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className="relative my-2 overflow-hidden rounded-lg border border-border bg-muted/40 select-none"
        style={{ minHeight: 120 }}
      >
        {/* Image preview (blurred) while uploading */}
        {isImage && previewSrc ? (
          <img
            src={previewSrc}
            alt=""
            className="block w-full object-cover"
            style={{ maxHeight: 320, filter: "blur(2px)", opacity: 0.55 }}
          />
        ) : (
          <div className="flex h-28 items-center justify-center">
            {isImage ? (
              <ImageIcon size={36} className="text-muted-foreground/40" />
            ) : (
              <Film size={36} className="text-muted-foreground/40" />
            )}
          </div>
        )}

        {/* Spinner + label overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50 backdrop-blur-[1px]">
          <Loader2 size={28} className="animate-spin text-foreground/70" />
          <span className="max-w-[260px] truncate text-center text-xs font-medium text-foreground/70">
            {fileName
              ? `Uploading ${fileName}…`
              : isImage
              ? "Uploading image…"
              : "Uploading video…"}
          </span>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ── TipTap Node extension ─────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    uploadPlaceholder: {
      insertUploadPlaceholder: (attrs: {
        uploadId: string;
        fileName: string;
        mediaType: "image" | "video";
        previewSrc?: string | null;
      }) => ReturnType;
    };
  }
}

export const UploadPlaceholder = Node.create({
  name: "uploadPlaceholder",
  group: "block",
  atom: true,
  draggable: false,
  selectable: false,

  addAttributes() {
    return {
      uploadId:  { default: null },
      fileName:  { default: "" },
      mediaType: { default: "image" },
      previewSrc:{ default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-upload-placeholder]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-upload-placeholder": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UploadPlaceholderView);
  },

  addCommands() {
    return {
      insertUploadPlaceholder:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
