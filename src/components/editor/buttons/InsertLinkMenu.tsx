"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "lucide-react";

export function InsertLinkMenu({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState("");
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

  const isValidUrl = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const setLink = () => {
    if (!href) { setError("URL is required"); return; }
    if (!isValidUrl(href)) { setError("Must be a valid http:// or https:// URL"); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setOpen(false);
    setHref("");
    setError("");
  };

  const unsetLink = () => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
    setHref("");
    setError("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const prev = editor.getAttributes("link")?.href;
          setHref(prev || "");
          setError("");
          setOpen((v) => !v);
        }}
        title="Insert link"
        className="flex h-7 w-7 items-center justify-center rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-100"
      >
        <Link size={14} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-xl shadow-xl p-3 z-[100]">
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            URL
          </label>
          <input
            type="text"
            placeholder="https://example.com"
            value={href}
            onChange={(e) => { setHref(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setLink(); } }}
            className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--l-moss)]/40"
            autoFocus
          />
          {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2.5">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={setLink}
              className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--l-moss)] text-white hover:bg-[var(--l-moss2)] transition-colors font-medium"
            >
              Apply
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={unsetLink}
              disabled={!editor.isActive("link")}
              className="flex-1 text-xs py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
