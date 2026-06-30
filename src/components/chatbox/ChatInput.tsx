

import {
  Loader2,
  SendHorizonal,
  ChevronDown,
  Sparkles,
  BrainCircuit,
  GraduationCap,
  AlignLeft,
  FileText,
  HelpCircle,
  Briefcase,
  Headphones,
  X,

} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import UploadFileButton from "./UploadFileButton";
import { cn, showError, showInfo, showSuccess } from "@/lib/utils";
import ActionSelect from "./ActionSelect";
import { AppDispatch, RootState } from "@/store";
import { useSelector } from "react-redux";
import { createMindMap, createStudyguide, createSummary, createFaq, createBriefing, createAudioOverview } from "@/lib/api/projects";
import { fetchSources, fetchDocs } from "@/store/docSlice";

import { useDispatch } from "react-redux";
import { uploadImageToServer } from "@/lib/api/chat";
import { useEditorCollab } from "@/contexts/EditorCollabContext";
import { SuggestedQuestions } from "./SuggestedQuestions";



const actions = [
  {
    id: "reports",
    label: "reports",
    icon: FileText,
    iconColor: "text-blue-600",
    bgHover: "hover:bg-blue-50",
  },
  {
    id: "summary",
    label: "Summarize",
    icon: AlignLeft,
    iconColor: "text-blue-600",
    bgHover: "hover:bg-blue-50",
  },
  {
    id: "studyguide",
    label: "Study guide",
    icon: GraduationCap,
    iconColor: "text-[var(--l-moss)]",
    bgHover: "hover:bg-[var(--l-tint)]",
  },
  {
    id: "mindmap",
    label: "MindMap",
    icon: BrainCircuit,
    iconColor: "text-emerald-600",
    bgHover: "hover:bg-emerald-50",
  },
  {
    id: "faq",
    label: "FAQ",
    icon: HelpCircle,
    iconColor: "text-amber-600",
    bgHover: "hover:bg-amber-50",
  },
  {
    id: "briefing",
    label: "Briefing Doc",
    icon: Briefcase,
    iconColor: "text-violet-600",
    bgHover: "hover:bg-violet-50",
  },
  {
    id: "audio",
    label: "Audio Overview",
    icon: Headphones,
    iconColor: "text-rose-600",
    bgHover: "hover:bg-rose-50",
  },
];

type ChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  sendMessage: (props: { markdownImageUrl: string | null | undefined, question?: string }) => void;
  loading: boolean;
  userId: string | undefined;

  projectId: string | undefined;
  questions: string[]
};


export const ChatInput = memo(
  function ChatInput ({
    input,
    setInput,
    sendMessage,
    loading,
    projectId,
    userId,
    questions

  }: ChatInputProps) {
    const [action, setAction] = useState("reports");
    const [loadingReport, setLoadingReport] = useState(false);
    const dispatch = useDispatch<AppDispatch>();

    const { docIds } = useSelector((state: RootState) => state.doc);
    const { activeRoom } = useSelector((state: RootState) => state.room);
    const roomId = activeRoom?.roomId;
    const { broadcastReportGenerated } = useEditorCollab();

    const [selectedImage, setSelectedImage] = useState<Blob | null>(null)
    const [markdownImageUrl, setMarkdownImageUrl] = useState<string | null>(null)
    const [blobImageToFile, SetBlobImageToFile] = useState<File | null>(null)
    const [imageUploading, setImageUploading] = useState(false)

    // @-mention state
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const { docs } = useSelector((state: RootState) => state.doc);

    const filteredSources = mentionQuery !== null
      ? docs.filter((s: any) =>
          (s.title || s.fileName || '').toLowerCase().includes(mentionQuery.toLowerCase())
        ).slice(0, 6)
      : [];

    // Reset highlighted index whenever the filtered list changes
    useEffect(() => { setMentionIndex(0); }, [mentionQuery]);

    const handleInputChange = useCallback((value: string) => {
      setInput(value);
      const cursorPos = textareaRef.current?.selectionStart ?? value.length;
      const textUpToCursor = value.slice(0, cursorPos);
      const match = textUpToCursor.match(/@([^@\s]*)$/);
      if (match) {
        setMentionQuery(match[1]);
      } else {
        setMentionQuery(null);
      }
    }, [setInput]);

    const insertMention = useCallback((source: any) => {
      const name = source.title || source.fileName || 'source';
      const cursorPos = textareaRef.current?.selectionStart ?? input.length;
      const before = input.slice(0, cursorPos);
      const after = input.slice(cursorPos);
      const replaced = before.replace(/@([^@\s]*)$/, `@${name} `);
      setInput(replaced + after);
      setMentionQuery(null);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }, [input, setInput]);






    const genereateMindMap = useCallback(async () => {
      if (!projectId || !userId) { showError("Project or user ID is missing"); return; }
      if (docIds.length === 0) { showError('Select at least one doc'); return; }
      try {
        setLoadingReport(true);
        await createMindMap({ projectId, userId, docIds });
        dispatch(fetchSources({ projectId, userId, roomId }));
        broadcastReportGenerated();
      } catch {
        showError('Failed to generate mind map');
      } finally {
        setLoadingReport(false);
      }
    }, [projectId, userId, docIds, dispatch, broadcastReportGenerated]);

    const generateStudyguide = useCallback(async () => {
      if (!projectId || !userId) { showError("Project or user ID is missing"); return; }
      if (docIds.length === 0) { showError('Select at least one doc'); return; }
      try {
        setLoadingReport(true);
        await createStudyguide({ projectId, userId, docIds });
        dispatch(fetchSources({ projectId, userId, roomId }));
        broadcastReportGenerated();
      } catch {
        showError('Failed to generate study guide');
      } finally {
        setLoadingReport(false);
      }
    }, [projectId, userId, docIds, dispatch, broadcastReportGenerated]);

    const generateSummary = useCallback(async () => {
      if (!projectId || !userId) { showError("Project or user ID is missing"); return; }
      if (docIds.length === 0) { showError('Select at least one doc'); return; }
      try {
        setLoadingReport(true);
        await createSummary({ projectId, userId, docIds });
        dispatch(fetchSources({ projectId, userId, roomId }));
        broadcastReportGenerated();
      } catch {
        showError('Failed to generate summary');
      } finally {
        setLoadingReport(false);
      }
    }, [projectId, userId, docIds, dispatch, broadcastReportGenerated]);

    const generateFaqReport = useCallback(async () => {
      if (!projectId || !userId) { showError("Project or user ID is missing"); return; }
      if (docIds.length === 0) { showError('Select at least one doc'); return; }
      try {
        setLoadingReport(true);
        await createFaq({ projectId, userId, docIds });
        dispatch(fetchSources({ projectId, userId, roomId }));
        broadcastReportGenerated();
      } catch {
        showError('Failed to generate FAQ');
      } finally {
        setLoadingReport(false);
      }
    }, [projectId, userId, docIds, dispatch, broadcastReportGenerated]);

    const generateBriefingReport = useCallback(async () => {
      if (!projectId || !userId) { showError("Project or user ID is missing"); return; }
      if (docIds.length === 0) { showError('Select at least one doc'); return; }
      try {
        setLoadingReport(true);
        await createBriefing({ projectId, userId, docIds });
        dispatch(fetchSources({ projectId, userId, roomId }));
        broadcastReportGenerated();
      } catch {
        showError('Failed to generate briefing');
      } finally {
        setLoadingReport(false);
      }
    }, [projectId, userId, docIds, dispatch, broadcastReportGenerated]);

    const generateAudioOverview = useCallback(async () => {
      if (!projectId || !userId) { showError("Project or user ID is missing"); return; }
      if (docIds.length === 0) { showError('Select at least one doc'); return; }
      try {
        setLoadingReport(true);
        showInfo('Generating audio overview — this may take a minute…');
        await createAudioOverview({ projectId, userId, docIds });
        dispatch(fetchSources({ projectId, userId, roomId }));
        broadcastReportGenerated();
      } catch {
        showError('Failed to generate audio overview');
      } finally {
        setLoadingReport(false);
      }
    }, [projectId, userId, docIds, dispatch, broadcastReportGenerated]);

    const handleActionChange = useCallback((newAction: string) => {
      setAction(newAction);
      if (newAction === 'summary') generateSummary();
      if (newAction === 'studyguide') generateStudyguide();
      if (newAction === 'mindmap') genereateMindMap();
      if (newAction === 'faq') generateFaqReport();
      if (newAction === 'briefing') generateBriefingReport();
      if (newAction === 'audio') generateAudioOverview();
    }, [generateSummary, generateStudyguide, genereateMindMap, generateFaqReport, generateBriefingReport, generateAudioOverview]);



    const { snippingFile: blobImage } = useSelector(
      (state: RootState) => state.chat
    );

    useEffect(() => {
      if (blobImage) {
        setSelectedImage(blobImage)

        const blobImageToFile = new File([blobImage], "snip_image.png", {
          type: "image/png",
        });
        SetBlobImageToFile(blobImageToFile)

      }

    }, [blobImage])





    return (
      <div className="border-t px-1 py-2">

        <ShowSelectImage
          image={selectedImage ?? undefined}
          uploading={imageUploading}
          onClear={() => {
            setSelectedImage(null);
            setMarkdownImageUrl(null);
            SetBlobImageToFile(null);
          }}
        />

        <div className="rounded-2xl border border-[var(--l-moss)] p-3 shadow-sm relative">

          {/* Selected-sources context badge */}
          {docIds.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Context:
              </span>
              {(docs as any[])
                .filter((d) => docIds.includes(d._id))
                .slice(0, 3)
                .map((d) => (
                  <span
                    key={d._id}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--l-tint)] px-2 py-0.5 text-[11px] font-medium text-[var(--l-moss)] max-w-[140px]"
                  >
                    <span className="truncate">{d.title || d.fileName || "Source"}</span>
                  </span>
                ))}
              {docIds.length > 3 && (
                <span className="text-[11px] text-muted-foreground">+{docIds.length - 3} more</span>
              )}
            </div>
          )}

          {/* @-mention dropdown */}
          {mentionQuery !== null && filteredSources.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-72 rounded-xl border border-border bg-popover shadow-lg z-50 overflow-hidden">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                Sources
              </div>
              {filteredSources.map((source: any, idx: number) => (
                <button
                  key={source._id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertMention(source); }}
                  onMouseEnter={() => setMentionIndex(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    idx === mentionIndex ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <span className="text-muted-foreground text-xs font-mono uppercase bg-muted px-1 rounded">
                    {source.source_type ?? 'doc'}
                  </span>
                  <span className="truncate">{source.title || source.fileName}</span>
                </button>
              ))}
              {filteredSources.length === 0 && mentionQuery !== null && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No sources found</p>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (mentionQuery !== null && filteredSources.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex(i => (i + 1) % filteredSources.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex(i => (i - 1 + filteredSources.length) % filteredSources.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(filteredSources[mentionIndex]);
                  return;
                }
              }
              if (e.key === "Escape") { setMentionQuery(null); return; }
              if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
                e.preventDefault();
                sendMessage({ markdownImageUrl });
                setSelectedImage(null);
                SetBlobImageToFile(null);
                setMarkdownImageUrl(null);
              }
            }}
            placeholder="Ask anything… type @ to mention a source"
            className="w-full resize-none border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />


          <div className="mt-3 flex items-center bg-transparent ">
            {/* LEFT SIDE */}
            <div className="flex items-center gap-2">
              <UploadImage
                userId={userId}
                projectId={projectId}
                setSelectedImage={setSelectedImage}
                setMarkdownImageUrl={setMarkdownImageUrl}
                blobImageToFile={blobImageToFile}
                SetBlobImageToFile={SetBlobImageToFile}
                onLoadingChange={setImageUploading}
              />
              <ActionSelect
                actions={actions}
                value={action}
                onChange={handleActionChange}
                loading={loadingReport}
              />


            </div>

            <button
              onClick={() => sendMessage({ markdownImageUrl })}
              disabled={!input.trim() || loading || imageUploading}
              className={cn(
                "ml-auto flex h-9 w-9 items-center justify-center rounded-full transition",
                input.trim()
                  ? "bg-[var(--l-moss)] hover:bg-[var(--l-moss2)]"
                  : "cursor-not-allowed opacity-40 bg-[var(--l-moss)]"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <SendHorizonal className="h-4 w-4 text-white" />
              )}
            </button>
          </div>


          {/* Suggested questions */}
          <SuggestedQuestions
            questions={questions}
            onSelect={(question: string) => sendMessage({ markdownImageUrl, question })}

          />

        </div>
      </div>
    );
  }
);





const UploadImage = ({ projectId, userId,
  blobImageToFile,
  setSelectedImage,
  setMarkdownImageUrl,
  SetBlobImageToFile,
  onLoadingChange,

}: {
  projectId: string | undefined,
  userId: string | undefined,
  blobImageToFile: File | null
  setSelectedImage: (image: any) => void
  setMarkdownImageUrl: (image: any) => void
  SetBlobImageToFile: (image: any) => void
  onLoadingChange?: (loading: boolean) => void
}) => {



  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || blobImageToFile
    if (!file) return;
    setSelectedImage(file)
    sendImageToServer(file)

    e.target.value = ""; // allow re-upload same file

  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };


  const sendImageToServer = async (file: File) => {
    setLoading(true);
    onLoadingChange?.(true);

    try {
      const data = await uploadImageToServer({
        image: file,
        projectId: projectId ?? "",
        userId: userId ?? "",
      });

      const imageUrl = data?.image?.fileUrl;
      if (!imageUrl) throw new Error("No image URL returned");

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      // imageUrl may already be a full Cloudinary URL — don't prepend baseUrl in that case
      const fullUrl = imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`;
      const markdownImage = `![image](${fullUrl})`;
      setMarkdownImageUrl(markdownImage)



    } catch (err) {
      console.error(err);
      showError("Error uploading the image");
      setSelectedImage(null);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  useEffect(() => {
    if (blobImageToFile) {
      sendImageToServer(blobImageToFile as File)
      SetBlobImageToFile(null)
      setMarkdownImageUrl(null)
    }

  }, [blobImageToFile])



  return (

    <UploadFileButton

      projectId={projectId ?? ""}
      loading={loading}
      triggerFileInput={triggerFileInput}
      inputFile={
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageUpload}
        />
      }


    />
  );
}






export const ShowSelectImage = memo(function ShowSelectImage({
  image,
  uploading,
  onClear,
}: {
  image?: Blob | MediaSource;
  uploading?: boolean;
  onClear?: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) { setObjectUrl(null); return; }
    const url = URL.createObjectURL(image);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  if (!image || !objectUrl) return null;
  return (
    <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-xl border border-border">
      <img
        src={objectUrl}
        alt="Uploaded preview"
        className="h-full w-full object-cover"
      />
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 size={14} className="animate-spin text-white" />
        </div>
      )}
      <button
        type="button"
        onClick={onClear}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
      >
        <X size={12} />
      </button>
    </div>
  );
});


