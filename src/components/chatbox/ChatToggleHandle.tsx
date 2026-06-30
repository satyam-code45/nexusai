
      "use client";

import { PanelRightOpen } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { openChat } from "@/store/uiSlice";

export default function ChatToggleHandle() {
  const dispatch = useDispatch();
  const isChatOpen = useSelector((state: RootState) => state.ui.isChatOpen);

  if (isChatOpen) return null;

  return (
    <button
      onClick={() => dispatch(openChat())}
      className="
        fixed right-0 top-4 z-50
        rounded-l-md border bg-background p-2
        shadow-md hover:bg-muted
        transition-all duration-300 ease-in-out
      "
      aria-label="Open chat"
    >
      <PanelRightOpen size={18} />
    </button>
  );
}
