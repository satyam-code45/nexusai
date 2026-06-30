import { ChatMessage } from "@/lib/api/chat";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export const AIThinkIng = ({
  message,
  loading,
  isUser,
  statusText,
}: {
  message: ChatMessage;
  loading: boolean;
  isUser: boolean;
  statusText?: string;
}) => {
  const [showThinking, setShowThinking] = useState(false);
  if (isUser) return null;

  // Still loading, nothing streamed yet — show status text (or fallback dots)
  if (loading && !message.content && !message.thinking) {
    const label = statusText || "Thinking…";
    return (
      <div className="flex items-center gap-1.5 py-0.5 mb-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
        <span className="text-[11px] text-muted-foreground ml-0.5">{label}</span>
      </div>
    );
  }

  // Has thinking content — collapsible toggle shown BELOW the answer (rendered from MessageBubble)
  if (message.thinking) {
    return (
      <div className="mt-3 pt-2 border-t border-border">
        {/* Show current step inline while still streaming */}
        {loading && statusText && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
            <span className="text-[11px] text-muted-foreground/60 italic">{statusText}</span>
          </div>
        )}
        <button
          onClick={() => setShowThinking((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              showThinking && "rotate-180"
            )}
          />
          <span className={cn(loading && "shimmer text-foreground/60")}>
            {showThinking ? "Hide thinking" : "Show thinking"}
          </span>
        </button>

        {showThinking && (
          <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3 text-[12px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {message.thinking}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AIThinkIng;
