import { memo, useMemo } from "react";
// import { Message } from "./Chatbox";
import { cn } from "@/lib/utils";
import { DisplayImageMarkdownURL, DisplayMarkDown } from "./DisplayMarkDown";
import { ChatMessage } from "@/lib/api/chat";

import { useState } from "react";
import { ChevronDown, BookOpen, Sparkles } from "lucide-react";
import AIThinkIng from "./AIThinking";

function parseSourcesFromContent(content: string): { body: string; sources: string[] } {
  const idx = content.lastIndexOf("\n\n**Sources:**");
  if (idx === -1) return { body: content, sources: [] };
  const body = content.slice(0, idx).trim();
  const sourceLine = content.slice(idx + "\n\n**Sources:**".length).trim();
  const sources = sourceLine
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { body, sources };
}



function formatTime(time?: string): string | null {
  if (!time) return null;
  try {
    return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export const MessageBubble = memo(function MessageBubble({
  message,
  loading,
  statusText,
}: {
  message: ChatMessage;
  loading: boolean;
  statusText?: string;
}) {
  const isUser = message.role === "user";

  const { body, sources } = useMemo(() => {
    if (isUser) return { body: message.content || "", sources: [] };
    return parseSourcesFromContent(message.content || "");
  }, [message.content, isUser]);

  // Don't render an empty AI bubble (e.g. from a stream error with no content)
  if (!isUser && !body && !message.thinking && !loading) return null;

  return (
    <div
      className={cn(
        "flex group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* AI avatar dot */}
      {!isUser && (
        <div className="flex-shrink-0 mr-2 mt-1">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "var(--l-moss)" }}>
            <Sparkles size={11} className="text-white" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm relative transition-colors duration-200",
          isUser
            ? "rounded-br-none shadow-sm text-white"
            : "bg-muted text-foreground rounded-bl-none shadow-sm"
        )}
        style={isUser ? { background: "var(--l-moss)" } : undefined}
      >
        {/* USER → plain text | ASSISTANT → Markdown */}
        {isUser ? (
          <div className="whitespace-pre-line leading-relaxed text-white/95">
            <DisplayImageMarkdownURL text={body} />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert prose-code:text-[var(--l-moss)] dark:prose-code:text-[var(--l-moss)]">
            <DisplayMarkDown text={body} />
          </div>
        )}

        {/* Source citation chips */}
        {!isUser && sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
            <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-[var(--l-tint)] border border-[var(--l-br)] px-2 py-0.5 text-[10px] font-medium text-[var(--l-moss)]"
              >
                {src}
              </span>
            ))}
          </div>
        )}

        {/* AI thinking toggle — rendered below answer */}
        <AIThinkIng message={message} loading={loading} isUser={isUser} statusText={statusText} />

        {formatTime(message.time) && (
          <div className={cn(
            "mt-1.5 text-[10px]",
            isUser ? "text-white/60 text-right" : "text-muted-foreground"
          )}>
            {formatTime(message.time)}
          </div>
        )}
      </div>
    </div>
  );
});
