"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { closeChat } from "@/store/uiSlice";
import { cn } from "@/lib/utils";

const TOPBAR_H = 44; // px — matches EditorTopBar height

const RightPanel = ({ children }: { children: React.ReactNode }) => {
  const [chatWidth, setChatWidth] = useState(580);
  const [isDragging, setIsDragging] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const dragRef = useRef<HTMLDivElement | null>(null);

  const dispatch = useDispatch();
  const isChatOpen = useSelector((state: RootState) => state.ui.isChatOpen);

  useEffect(() => {
    const check = () => setIsSmall(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) dispatch(closeChat());
  }, [dispatch]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 380 && newWidth <= 700) setChatWidth(newWidth);
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // On small screens: fixed overlay that starts right of the sidebar
  if (isSmall) {
    return (
      <aside
        className={cn(
          "flex flex-col bg-background border-l border-border overflow-hidden transition-opacity duration-300",
          isChatOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{
          position: "fixed",
          left: "var(--sidebar-w, 0px)",
          right: 0,
          top: TOPBAR_H,
          bottom: 0,
          zIndex: 40,
          // keep it in the DOM for transition, but invisible when closed
          visibility: isChatOpen ? "visible" : "hidden",
        }}
      >
        {children}
      </aside>
    );
  }

  // Large screens: resizable inline panel
  return (
    <aside
      className={cn(
        "relative flex flex-col bg-background border-l border-border overflow-hidden transition-all duration-500 ease-in-out",
        isChatOpen ? "max-w-[700px] opacity-100" : "max-w-0 opacity-0"
      )}
      style={{ flexBasis: isChatOpen ? chatWidth : 0 }}
    >
      {isChatOpen && (
        <div
          ref={dragRef}
          onMouseDown={() => setIsDragging(true)}
          className={cn(
            "absolute left-0 top-0 h-full w-2 cursor-col-resize group transition-colors duration-200",
            isDragging ? "bg-[var(--l-moss)]/20" : "hover:bg-[var(--l-moss)]/10"
          )}
        >
          <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-[var(--l-moss)] transition-colors duration-200">
            <GripVertical size={16} />
          </div>
        </div>
      )}
      {children}
    </aside>
  );
};

export default RightPanel;
