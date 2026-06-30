import { AppDispatch } from "@/store";
import { toggleChat } from "@/store/uiSlice";
import { PanelRightClose, Sparkles } from "lucide-react";
import { useDispatch } from "react-redux";

const ChatBoxHeader = ({ selectedProject }: { selectedProject: string | null }) => {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg shadow-sm" style={{ background: "var(--l-moss)" }}>
          <Sparkles size={13} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">AI Assistant</p>
          {selectedProject && (
            <p className="text-[11px] text-muted-foreground truncate">{selectedProject}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => dispatch(toggleChat())}
        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        title="Close chat"
      >
        <PanelRightClose size={16} />
      </button>
    </header>
  );
};

export default ChatBoxHeader;