import { showError, showSuccess } from "@/lib/utils";
import { Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchDocs } from "@/store/docSlice";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { useEditorCollab } from "@/contexts/EditorCollabContext";

export const DragAndDropSection = ({
  projectId,
  userId,
}: {
  projectId?: string;
  userId: string | undefined;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeRoom } = useSelector((state: RootState) => state.room);
  const roomId = activeRoom?.roomId;
  const { broadcastSourceUploaded } = useEditorCollab();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
  };

  const uploadFiles = (files: FileList) => {
    // Close modal immediately — upload continues in the background
    dispatch(toggleAddSourceModal());

    const fileNames = Array.from(files).map((f) => f.name).join(", ");

    // fire-and-forget — this function intentionally does not await
    (async () => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("file", file);
        formData.append("userId", userId ?? "");
        formData.append("projectId", projectId ?? "");
      });

      try {
        const response = await fetch(`/api/addsource/uploads`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message || `Upload failed (${response.status})`);
        }

        showSuccess(`"${fileNames}" uploaded successfully`);
        if (projectId && userId) {
          dispatch(fetchDocs({ projectId, userId, roomId }));
          broadcastSourceUploaded();
        }
      } catch (error) {
        showError((error as Error)?.message || "Upload failed");
        console.error("[DragAndDrop] upload error:", error);
      }
    })();
  };

  return (
    <div
      className={`mb-4 rounded-xl p-7 flex flex-col items-center justify-center text-center transition-colors ${
        isDragging
          ? "border-2 border-solid border-[var(--l-moss)] bg-[var(--l-tint)]"
          : "border-2 border-dashed border-border hover:border-[var(--l-moss)] hover:bg-muted"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{ cursor: "pointer" }}
    >
      <div className="bg-[var(--l-tint)] rounded-full p-4 mb-3">
        <UploadCloud className="w-8 h-8 text-[var(--l-moss)]" />
      </div>

      <p className="font-medium text-foreground">Upload sources</p>
      <p className="text-muted-foreground text-sm mb-2">
        Drag & drop or{" "}
        <span className="text-[var(--l-moss)] cursor-pointer">choose file</span> to upload
      </p>
      <p className="text-muted-foreground text-xs">Supported: PDF, .txt, .docx, .pptx, Markdown</p>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        multiple
        accept=".pdf,.txt,.docx,.pptx,.doc,.md"
      />
    </div>
  );
};
