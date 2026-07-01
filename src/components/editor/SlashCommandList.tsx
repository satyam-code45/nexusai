"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
import ReactDOM from "react-dom";
import {
  Type, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus,
  Table as TableIcon, ImageIcon, FileText, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Editor } from "@tiptap/react";

export interface SlashCommand {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  keywords: string[];
  action: (editor: Editor) => void;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    title: "Text",
    subtitle: "Start writing with plain text",
    icon: Type,
    keywords: ["text", "paragraph", "p"],
    action: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    title: "Heading 1",
    subtitle: "Big section heading",
    icon: Heading1,
    keywords: ["h1", "heading", "title", "big"],
    action: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    subtitle: "Medium section heading",
    icon: Heading2,
    keywords: ["h2", "heading", "subtitle"],
    action: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    subtitle: "Small section heading",
    icon: Heading3,
    keywords: ["h3", "heading", "small"],
    action: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    subtitle: "Create an unordered list",
    icon: List,
    keywords: ["ul", "list", "bullet", "unordered"],
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    subtitle: "Create a numbered list",
    icon: ListOrdered,
    keywords: ["ol", "list", "numbered", "ordered"],
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Quote",
    subtitle: "Capture a quote",
    icon: Quote,
    keywords: ["quote", "blockquote", "callout"],
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    subtitle: "Add a code snippet",
    icon: Code2,
    keywords: ["code", "pre", "snippet", "block"],
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    subtitle: "Add a horizontal rule",
    icon: Minus,
    keywords: ["hr", "divider", "separator", "rule"],
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Table",
    subtitle: "Insert a table",
    icon: TableIcon,
    keywords: ["table", "grid"],
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Image",
    subtitle: "Upload an image from your computer",
    icon: ImageIcon,
    keywords: ["image", "img", "picture", "photo", "upload"],
    action: (_e) => { /* handled by onImageTrigger prop */ },
  },
  {
    title: "Video",
    subtitle: "Upload a video from your computer",
    icon: Video,
    keywords: ["video", "mp4", "film", "movie", "upload"],
    action: (_e) => { /* handled by onVideoTrigger prop */ },
  },
  {
    title: "Page",
    subtitle: "Create a sub-page inside this document",
    icon: FileText,
    keywords: ["page", "subpage", "child", "link", "nested"],
    action: (e) =>
      e.chain().focus().insertContent({ type: "pageBlock", attrs: { docId: "", title: "" } }).run(),
  },
];

export interface SlashCommandListHandle {
  navigate: (dir: number) => void;
  select: () => void;
}

interface Props {
  x: number;
  y: number;
  query: string;
  editor: Editor;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
  onImageTrigger?: () => void;
  onVideoTrigger?: () => void;
}

const SlashCommandListInner = forwardRef<SlashCommandListHandle, Props>(
  ({ x, y, query, editor, onSelect, onClose, onImageTrigger, onVideoTrigger }, ref) => {
    const [selected, setSelected] = useState(0);

    const items = query
      ? SLASH_COMMANDS.filter(
          (c) =>
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.keywords.some((k) => k.includes(query.toLowerCase()))
        )
      : SLASH_COMMANDS;

    useEffect(() => { setSelected(0); }, [query]);

    const triggerCmd = (cmd: SlashCommand) => {
      if (cmd.title === "Image" && onImageTrigger) {
        onSelect(cmd);      // deleteRange removes the "/" text
        onImageTrigger();
      } else if (cmd.title === "Video" && onVideoTrigger) {
        onSelect(cmd);      // deleteRange removes the "/" text
        onVideoTrigger();
      } else {
        onSelect(cmd);
      }
    };

    useImperativeHandle(ref, () => ({
      navigate: (dir: number) => {
        setSelected((prev) => {
          const next = prev + dir;
          if (next < 0) return items.length - 1;
          if (next >= items.length) return 0;
          return next;
        });
      },
      select: () => {
        const cmd = items[selected];
        if (cmd) triggerCmd(cmd);
      },
    }));

    if (items.length === 0) return null;

    const safeX = Math.min(x, window.innerWidth - 280);
    const safeY = y + 4;

    return ReactDOM.createPortal(
      <div
        className="fixed z-[9999] w-72 rounded-xl border border-border bg-background shadow-2xl dark:shadow-black/50 overflow-hidden"
        style={{ top: safeY, left: safeX }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="px-3 py-1.5 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {query ? `Results for "${query}"` : "Commands"}
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {items.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  triggerCmd(cmd);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  selected === i
                    ? "bg-[var(--l-tint)]"
                    : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm",
                    selected === i
                      ? "border-[var(--l-moss)]/40 bg-[var(--l-tint)] text-[var(--l-moss)]"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  <Icon size={14} />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className={cn("text-sm font-medium truncate", selected === i ? "text-[var(--l-moss)]" : "text-foreground")}>
                    {cmd.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {cmd.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-3 py-1.5 border-t border-border flex gap-3 text-[10px] text-muted-foreground">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>,
      document.body
    );
  }
);

SlashCommandListInner.displayName = "SlashCommandList";
export const SlashCommandList = SlashCommandListInner;
