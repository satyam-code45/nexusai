import { SlidersHorizontal, Languages, SpellCheck, ArrowUpWideNarrow, ArrowDownWideNarrow, Loader2 } from "lucide-react";
import { MenuItem } from "./FloatingMenu";
import { Editor } from "@tiptap/react";
import { useState } from "react";

interface AIPanelProps {
  aiOpen: boolean;
  onExecute: (action: string) => void;
  editor: Editor
}

export function AIPanel({ aiOpen, onExecute, editor }: AIPanelProps) {
  if (!aiOpen) return null;

  const [loading, setLoading] = useState(false)
  const [rephraseLoading, setRephraseLoading] = useState(false)


  const translate = () => {
    setLoading(true)
    editor.chain().focus().translate().run()
    setTimeout(() => setLoading(false), 3000)
  }

  const rephrase = () => {
    setRephraseLoading(true)
    editor.chain().focus().rephrase().run()
    setTimeout(() => setRephraseLoading(false), 3000)
  }


  return (
  <div
  onPointerDown={(e) => e.stopPropagation()}
  className="absolute top-full mt-2 w-72 rounded-xl border bg-background shadow-xl p-3 space-y-0.5"
>
  {/* Edit with AI Button */}
  <button
    onPointerDown={(e) => e.stopPropagation()}
    className="flex items-center gap-2 text-sm text-foreground hover:bg-muted px-2 py-1 rounded-md w-full transition-colors"
  >
    <SlidersHorizontal size={14} />
    Edit with AI
  </button>

  {/* Divider */}
  <div className="h-px bg-border my-1" />

  {loading ? (
    <div className="flex items-center text-sm p-2 text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Translating...
    </div>
  ) : (
    <MenuItem
      icon={<Languages size={14} />}
      label="Translate to French"
      onClick={translate}
    />
  )}

  {rephraseLoading ? (
    <div className="flex items-center text-sm p-2 text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Improving...
    </div>
  ) : (
    <MenuItem
      icon={<Languages size={14} />}
      label="Improve"
      onClick={rephrase}
    />
  )}
</div>

  );
}