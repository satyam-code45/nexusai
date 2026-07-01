"use client";

import { ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { goBackTo } from "@/store/aiEditorSlice";
import { useRouter } from "next/navigation";

export function Breadcrumb() {
  const { navStack } = useSelector((state: RootState) => state.aiEditor);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  // Only show when inside a sub-page (2+ levels)
  if (navStack.length < 2) return null;

  return (
    <div className="mb-3 flex items-center gap-0.5 flex-wrap">
      {navStack.map((doc, idx) => {
        const isLast = idx === navStack.length - 1;
        return (
          <span key={doc._id} className="flex items-center gap-0.5 min-w-0">
            {idx > 0 && (
              <ChevronRight size={11} className="shrink-0 text-border mx-0.5" />
            )}
            {isLast ? (
              <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[200px]">
                {doc.title || "Untitled"}
              </span>
            ) : (
              <button
                onClick={() => {
                  dispatch(goBackTo(idx));
                  router.push(`?doc=${doc._id}`);
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {doc.title || "Untitled"}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
