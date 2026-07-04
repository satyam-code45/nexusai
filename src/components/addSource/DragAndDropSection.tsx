import { showError, showSuccess } from "@/lib/utils";
import { Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchDocs } from "@/store/docSlice";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { useEditorCollab } from "@/contexts/EditorCollabContext";

// Vercel Serverless Functions hard-cap the request body at 4.5MB (platform-level,
// not configurable) — files past this never reach the route handler, they're
// rejected at the gateway with a bare 413. Leave headroom below 4.5MB for
// multipart/form-data overhead so this check trips before the gateway does.
const MAX_UPLOAD_BYTES = 4.3 * 1024 * 1024;
const MAX_UPLOAD_LABEL = "4.3MB";

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
    const allFiles = Array.from(files);

    // The route reads a single "file" field per request, so each file needs
    // its own request anyway — that also means each request body is just one
    // file, which is what keeps it under Vercel's per-request size limit.
    const validFiles = allFiles.filter((file) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        showError(`"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max upload size is ${MAX_UPLOAD_LABEL}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Close modal immediately — upload continues in the background
    dispatch(toggleAddSourceModal());

    // fire-and-forget — this function intentionally does not await
    (async () => {
      const results = await Promise.allSettled(
        validFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("userId", userId ?? "");
          formData.append("projectId", projectId ?? "");

          const response = await fetch(`/api/addsource/uploads`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            if (response.status === 413) {
              throw new Error(`"${file.name}" exceeds the ${MAX_UPLOAD_LABEL} upload limit`);
            }
            const body = await response.json().catch(() => ({}));
            throw new Error(body?.message || `"${file.name}" failed (${response.status})`);
          }

          return file.name;
        })
      );

      const succeeded = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>[];
      const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      if (succeeded.length > 0) {
        showSuccess(`"${succeeded.map((r) => r.value).join(", ")}" uploaded successfully`);
      }
      failed.forEach((r) => {
        showError(r.reason?.message || "Upload failed");
        console.error("[DragAndDrop] upload error:", r.reason);
      });

      if (succeeded.length > 0 && projectId && userId) {
        dispatch(fetchDocs({ projectId, userId, roomId }));
        broadcastSourceUploaded();
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
      <p className="text-muted-foreground text-xs">Max file size: {MAX_UPLOAD_LABEL}</p>

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
