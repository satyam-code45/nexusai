"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoveLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { sendYoutubeLink } from "@/lib/api/addsource";
import { fetchDocs } from "@/store/docSlice";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { showError, showSuccess } from "@/lib/utils";
import { useEditorCollab } from "@/contexts/EditorCollabContext";

const formSchema = z.object({
  youtubeLink: z.string().min(1, "Link is required").url("Please enter a valid URL"),
});

type FormValues = z.infer<typeof formSchema>;

const AddYoutubeLinkForm = ({
  hideYoutubeLinkForm,
  projectId,
  userId,
}: {
  hideYoutubeLinkForm: () => void;
  projectId?: string;
  userId: string;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeRoom } = useSelector((state: RootState) => state.room);
  const roomId = activeRoom?.roomId;
  const { broadcastSourceUploaded } = useEditorCollab();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const onSubmit = (data: FormValues) => {
    // Close modal immediately
    dispatch(toggleAddSourceModal());
    reset();

    // Process in background
    (async () => {
      try {
        const res = await sendYoutubeLink({ youtubeLink: data.youtubeLink, projectId, userId });
        showSuccess((res as any)?.message ?? "YouTube video added successfully");
        if (projectId && userId) {
          dispatch(fetchDocs({ projectId, userId, roomId }));
          broadcastSourceUploaded();
        }
      } catch (error) {
        showError((error as Error)?.message ?? "Failed to add YouTube video");
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={hideYoutubeLinkForm}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <MoveLeft size={15} />
        </button>
        <Label htmlFor="link" className="text-sm font-semibold">
          Paste a YouTube link
        </Label>
      </div>

      <Textarea
        id="link"
        placeholder="https://youtube.com/watch?v=..."
        className="resize-y min-h-[100px] mt-2 text-sm placeholder:text-sm"
        {...register("youtubeLink")}
      />

      {errors.youtubeLink && (
        <p className="text-red-500 text-xs mt-1">{errors.youtubeLink.message}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          Add Video
        </Button>
      </div>
    </form>
  );
};

export default AddYoutubeLinkForm;
