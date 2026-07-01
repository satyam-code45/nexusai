
"use client"
import React, { useEffect, useRef, useState } from 'react';
import {
  Type, Heading1, Heading2, Heading3,
  List, ListOrdered, Code, Quote, Table as TableIcon,
  Bold, Italic, Underline as UnderlineIcon, Highlighter,
  ChevronDown,
  Sparkles,
  ArrowUp,
  X,
  ArrowUpWideNarrow,
  SpellCheck,
  ArrowDownWideNarrow,
  SlidersHorizontal,
  Languages,
  Undo,
  Redo
} from 'lucide-react';
import { Coordinates } from '../types/editor.types';
import { Editor } from '@tiptap/react';
import { TextMenu } from '../TextMenu';
import { AIPanel } from './AIPanel';
import {TextFormattingPanel} from './TextFormattingPanel'
interface FloatingMenuProps {
  position: Coordinates;
  isVisible: boolean;
  mode: 'selection' | 'slash';
  onExecute: (command: string, value?: any) => void;
  editor:Editor

}




export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  position,
  isVisible,
  mode,
  onExecute,
  editor

}) => {
  const [textOpen, setTextOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [textFormattingPanel, setTextFormattingPanel] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setTextOpen(false);
      setAiOpen(false);
    }
  }, [isVisible]);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      // If clicking outside the menu, close internal states
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setTextOpen(false);
        setAiOpen(false);
      }
    };

    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  if (!isVisible) return null;

  const style: React.CSSProperties = {
    top: position.top,
    left: position.left,
    transform:
      position.top < 120
        ? "translateY(10px)"
        : mode === "selection"
          ? "translateY(-100%)"
          : "translateY(10px)",
  };

  return (
    <div
  ref={ref}
  onPointerDown={(e) => e.stopPropagation()}
  className="
    fixed z-50 flex flex-col
    bg-background
    border border-border
    rounded-xl
    shadow-xl dark:shadow-black/40
    animate-in fade-in duration-150
    transition-colors
  "
  style={style}
>
  {/* TOOLBAR */}
  <div className="flex items-center p-1 gap-1">
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => setTextFormattingPanel((v) => !v)}
      className="
        flex items-center gap-1.5 px-2 py-1 rounded
        text-sm font-medium
        text-foreground
        hover:bg-muted
        transition-colors
      "
    >
      Text
      <ChevronDown size={14} />
    </button>

    <ToolbarBtn icon={<Bold size={14} />} onClick={() => onExecute("bold")} />
    <ToolbarBtn icon={<Italic size={14} />} onClick={() => onExecute("italic")} />
    <ToolbarBtn icon={<UnderlineIcon size={14} />} onClick={() => onExecute("underline")} />

    <div className="w-px h-4 bg-border mx-1" />

    {/* Highlighters */}
    <ToolbarBtn
      icon={<Highlighter size={14} className="bg-yellow-300 rounded-full border border-yellow-400 text-yellow-300" />}
      onClick={() => onExecute("highlight", "oklch(0.945 0.129 101.54)")}
    />
    <ToolbarBtn
      icon={<Highlighter size={14} className="bg-red-300 rounded-full border border-red-400 text-red-300" />}
      onClick={() => onExecute("highlight", "oklch(88.5% 0.062 18.334)")}
    />
    <ToolbarBtn
      icon={<Highlighter size={14} className="bg-green-400 rounded-full border border-green-500 text-green-400" />}
      onClick={() => onExecute("highlight", "oklch(0.925 0.084 155.995)")}
    />
    <ToolbarBtn
      icon={<Highlighter size={14} className="bg-cyan-400 rounded-full border border-cyan-500 text-cyan-400" />}
      onClick={() => onExecute("highlight", "oklch(0.917 0.08 205.041)")}
    />

    <ToolbarBtn icon={<Undo size={14} />} onClick={() => onExecute("undo")} />
    <ToolbarBtn icon={<Redo size={14} />} onClick={() => onExecute("redo")} />

    <div className="w-px h-4 bg-border mx-1" />

    <ToolbarBtn
      icon={<Sparkles className="stroke-violet-600 dark:stroke-violet-400" size={14} />}
      onClick={() => setAiOpen((v) => !v)}
    />
  </div>

  {/* AI PANEL */}
  <AIPanel
    editor={editor}
    aiOpen={aiOpen}
    onExecute={(action) => onExecute(action)}
  />

  {/* TEXT FORMATTING PANEL */}
  <TextFormattingPanel
    editor={editor}
    showMenu={textFormattingPanel}
    onExecute={(action) => console.log("action triggered:", action)}
  />
</div>

  );
};

/* ------------------ SUB COMPONENTS ------------------ */

const ToolbarBtn = ({
  icon,
  onClick,
}: {
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onPointerDown={(e) => {
      e.preventDefault(); // keep editor focus
      e.stopPropagation();
    }}
    onClick={onClick}
    className="
      p-1.5 rounded
      text-foreground
      hover:bg-muted
      transition-colors
    "
  >
    {icon}
  </button>
);
export const MenuItem = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onPointerDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onClick={onClick}
    className="
      flex items-center w-full px-2 py-1.5 rounded
      text-sm
      text-foreground
      hover:bg-muted
      transition-colors
    "
  >
    <span className="mr-3 text-muted-foreground">
      {icon}
    </span>
    {label}
  </button>
);
