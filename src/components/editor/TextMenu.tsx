"use client";

import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Table,
  Quote,
  Type,
} from "lucide-react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";


export function TextMenu({
  editor,
  onClose,
   placement = "top",
}: {
  editor: Editor;
  onClose: () => void;
   placement:"top"|"bottom",
}) {
  const run = (command: () => void) => {
    command();
    onClose(); // 👈 CLOSE MENU AFTER ACTION
  };
  const positionClass =
    placement === "top"
      ? "absolute bottom-full mb-2"
      : "absolute top-full mt-2";

  return (
    <div
      className={`
        ${positionClass}
        w-56 rounded-xl bg-background border border-border shadow-lg z-50
      `}
    >


      <TextFormattingMenu icon={Type} label="Text"
        onClick={() => run(() =>
          editor.chain().focus().setParagraph().run()
        )}
      />
      <TextFormattingMenu icon={Heading1} label="Heading 1"
        onClick={() => run(() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        )}
      />
      <TextFormattingMenu icon={Heading2} label="Heading 2"
        onClick={() => run(() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        )}
      />
      <TextFormattingMenu icon={Heading3} label="Heading 3"
        onClick={() => run(() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        )}
      />

      <Divider />

      <TextFormattingMenu icon={List} label="Bulleted List"
        onClick={() => run(() =>
          editor.chain().focus().toggleBulletList().run()
        )}
      />
      <TextFormattingMenu icon={ListOrdered} label="Numbered List"
        onClick={() => run(() =>
          editor.chain().focus().toggleOrderedList().run()
        )}
      />

      <Divider />

      <TextFormattingMenu icon={Code} label="Code Block"
        onClick={() => run(() =>
          editor.chain().focus().toggleCodeBlock().run()
        )}
      />
      <TextFormattingMenu icon={Table} label="Table"
        onClick={() => run(() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()
        )}
      />
      <TextFormattingMenu icon={Quote} label="Block Quote"
        onClick={() => run(() =>
          editor.chain().focus().toggleBlockquote().run()
        )}
      />
      
    </div>
  );
}

export function TextFormattingMenu({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-sm rounded-md transition-colors duration-200",
        active
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export function Divider() {
  return (
    <div
      className={cn(
        "my-1 h-px",
        "bg-border"
      )}
    />
  );
}