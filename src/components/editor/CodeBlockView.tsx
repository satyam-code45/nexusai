"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Check, Copy, ChevronDown, Search } from "lucide-react";

// ── Language list (lowlight 'common' bundle) ─────────────────────────────────
const LANGUAGES = [
  { label: "Plain text",   value: "text" },
  { label: "Bash / Shell", value: "bash" },
  { label: "C",            value: "c" },
  { label: "C++",          value: "cpp" },
  { label: "C#",           value: "csharp" },
  { label: "CSS",          value: "css" },
  { label: "Diff",         value: "diff" },
  { label: "Dockerfile",   value: "dockerfile" },
  { label: "Go",           value: "go" },
  { label: "GraphQL",      value: "graphql" },
  { label: "HTML / XML",   value: "xml" },
  { label: "Java",         value: "java" },
  { label: "JavaScript",   value: "javascript" },
  { label: "JSON",         value: "json" },
  { label: "Kotlin",       value: "kotlin" },
  { label: "Less",         value: "less" },
  { label: "Lua",          value: "lua" },
  { label: "Makefile",     value: "makefile" },
  { label: "Markdown",     value: "markdown" },
  { label: "Objective-C",  value: "objectivec" },
  { label: "Perl",         value: "perl" },
  { label: "PHP",          value: "php" },
  { label: "Python",       value: "python" },
  { label: "R",            value: "r" },
  { label: "Ruby",         value: "ruby" },
  { label: "Rust",         value: "rust" },
  { label: "SCSS",         value: "scss" },
  { label: "SQL",          value: "sql" },
  { label: "Swift",        value: "swift" },
  { label: "TypeScript",   value: "typescript" },
  { label: "VB.Net",       value: "vbnet" },
  { label: "WebAssembly",  value: "wasm" },
  { label: "YAML",         value: "yaml" },
];

const LANG_LABEL = new Map(LANGUAGES.map(l => [l.value, l.label]));

// ── Component ────────────────────────────────────────────────────────────────
export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied]       = useState(false);
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState("");

  const dropRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const codeRef   = useRef<HTMLPreElement>(null);

  const currentLang  = (node.attrs.language as string) || "text";
  const currentLabel = LANG_LABEL.get(currentLang) ?? currentLang;
  const caption      = (node.attrs.caption as string) ?? "";

  const filtered = query.trim()
    ? LANGUAGES.filter(l =>
        l.label.toLowerCase().includes(query.toLowerCase()) ||
        l.value.toLowerCase().includes(query.toLowerCase())
      )
    : LANGUAGES;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-focus the search field when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  const copy = useCallback(async () => {
    const text = codeRef.current?.textContent ?? "";
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const pickLang = (value: string) => {
    updateAttributes({ language: value });
    setOpen(false);
    setQuery("");
  };

  return (
    <NodeViewWrapper className="ncb-wrapper">
      {/* ── Dark code container ─────────────────────────────────────── */}
      <div className="ncb-block">

        {/* Header: language pill (left) + copy (right) */}
        <div className="ncb-header" contentEditable={false}>

          {/* Language selector */}
          <div className="ncb-lang-root" ref={dropRef}>
            <button className="ncb-lang-btn" onClick={() => setOpen(v => !v)}>
              {currentLabel}
              <ChevronDown size={10} className="ncb-chevron" />
            </button>

            {open && (
              <div className="ncb-dropdown">
                {/* Search */}
                <div className="ncb-search-row">
                  <Search size={12} className="ncb-search-icon" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Filter languages…"
                    className="ncb-search-input"
                    onKeyDown={e => {
                      if (e.key === "Escape") { setOpen(false); setQuery(""); }
                      if (e.key === "Enter" && filtered.length > 0) pickLang(filtered[0].value);
                      e.stopPropagation();
                    }}
                  />
                </div>

                {/* List */}
                <div className="ncb-lang-list">
                  {filtered.length === 0 ? (
                    <p className="ncb-no-match">No languages match "{query}"</p>
                  ) : filtered.map(lang => (
                    <button
                      key={lang.value}
                      className={`ncb-lang-item${currentLang === lang.value ? " ncb-lang-active" : ""}`}
                      onMouseDown={e => { e.preventDefault(); pickLang(lang.value); }}
                    >
                      {lang.label}
                      {currentLang === lang.value && <Check size={11} className="ncb-check" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Copy button */}
          <button
            className={`ncb-copy-btn${copied ? " ncb-copied" : ""}`}
            onClick={copy}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>

        {/* Code area — NodeViewContent renders the editable code */}
        <pre ref={codeRef} className="ncb-pre">
          <NodeViewContent as={"code" as any} className="ncb-code" />
        </pre>
      </div>

      {/* Caption — below the dark block, outside contentEditable scope */}
      <div contentEditable={false} className="ncb-caption-row">
        <input
          type="text"
          value={caption}
          onChange={e => updateAttributes({ caption: e.target.value })}
          placeholder="Add a caption…"
          className="ncb-caption"
          onKeyDown={e => e.stopPropagation()}
        />
      </div>
    </NodeViewWrapper>
  );
}
