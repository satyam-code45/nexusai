"use client"
import { useEffect, useState } from "react";
import { SquarePlay, ClipboardMinus, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { DragAndDropSection } from "./DragAndDropSection";
import AddYoutubeLinkForm from "./AddYoutubeForm";
import { AddPasteTextForm } from "./AddPasteTextForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ActiveForm = "youtube" | "text" | null;

const SOURCE_TYPES = [
  {
    id: "youtube" as const,
    icon: SquarePlay,
    label: "YouTube",
    description: "Add a video transcript",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-100 dark:border-red-900/40",
    hover: "hover:border-red-300 hover:bg-red-50/80",
  },
  {
    id: "text" as const,
    icon: ClipboardMinus,
    label: "Paste text",
    description: "Add copied text directly",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-100 dark:border-violet-900/40",
    hover: "hover:border-violet-300 hover:bg-violet-50/80",
  },
];

const AddSourceModal = ({ projectId, userId }: { projectId: string | undefined; userId: string | undefined }) => {
  const { addSourceModal } = useSelector((state: RootState) => state.project);
  const dispatch = useDispatch<AppDispatch>();
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  // Reset to home view every time modal opens (handles cases where sub-forms
  // close the modal directly via dispatch without going through `close`)
  useEffect(() => {
    if (addSourceModal) setActiveForm(null);
  }, [addSourceModal]);

  const close = () => {
    setActiveForm(null);
    dispatch(toggleAddSourceModal());
  };
  const back = () => setActiveForm(null);

  return (
    <Dialog open={addSourceModal} onOpenChange={close}>
      <DialogContent
        className="p-0 overflow-hidden border-0 shadow-2xl flex flex-col"
        style={{ maxWidth: 560, width: "94vw", borderRadius: 16, maxHeight: "90vh" }}
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Add Sources</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload files or add content from the web
            </p>
          </div>
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body — flex-1 + overflow-y-auto ensures long paste text scrolls instead of overflowing */}
        <div className="px-6 py-5 flex-1 min-h-0 overflow-y-auto">
          {activeForm === null && (
            <>
              {/* Drag & drop */}
              <DragAndDropSection projectId={projectId} userId={userId} />

              {/* Source type cards */}
              <div className="mt-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
                  Or add from
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {SOURCE_TYPES.map(({ id, icon: Icon, label, description, color, bg, border, hover }) => (
                    <button
                      key={id}
                      onClick={() => setActiveForm(id)}
                      className={`group flex flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left transition-all ${border} ${hover} dark:hover:border-opacity-60`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                        <Icon size={15} className={color} />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground leading-tight">{label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeForm === "youtube" && (
            <AddYoutubeLinkForm
              userId={userId ?? ""}
              projectId={projectId}
              hideYoutubeLinkForm={back}
            />
          )}

          {activeForm === "text" && (
            <AddPasteTextForm
              userId={userId ?? ""}
              projectId={projectId}
              hidePasteTextForm={back}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSourceModal;
