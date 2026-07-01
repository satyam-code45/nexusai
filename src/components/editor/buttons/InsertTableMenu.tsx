"use client";

import { useState, useRef, useEffect } from "react";
import { Table } from "lucide-react";

export function InsertTableMenu({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeader, setWithHeader] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: withHeader }).run();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        title="Insert table"
        className="flex h-7 w-7 items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-100"
      >
        <Table size={14} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border rounded-xl shadow-xl p-3 z-[100]">
          <div className="flex gap-2 mb-2.5">
            <label className="flex-1 text-xs font-medium text-muted-foreground">
              Rows
              <input
                type="number" min={1} max={20} value={rows}
                onChange={(e) => setRows(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full border border-border rounded-lg px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--l-moss)]/40"
              />
            </label>
            <label className="flex-1 text-xs font-medium text-muted-foreground">
              Cols
              <input
                type="number" min={1} max={20} value={cols}
                onChange={(e) => setCols(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full border border-border rounded-lg px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--l-moss)]/40"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2.5 cursor-pointer">
            <input
              type="checkbox" checked={withHeader}
              onChange={(e) => setWithHeader(e.target.checked)}
              className="rounded"
            />
            Header row
          </label>

          <div className="flex gap-2">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertTable}
              className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--l-moss)] text-white hover:bg-[var(--l-moss2)] transition-colors font-medium"
            >
              Insert
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { editor.chain().focus().deleteTable().run(); setOpen(false); }}
              disabled={!editor.can().deleteTable()}
              className="flex-1 text-xs py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
