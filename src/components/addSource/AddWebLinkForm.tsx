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
import { sendWeblink } from "@/lib/api/addsource";
import { fetchDocs } from "@/store/docSlice";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { showError, showSuccess } from "@/lib/utils";
import { useEditorCollab } from "@/contexts/EditorCollabContext";

const formSchema = z.object({
  weblink: z.string().min(1, "Link is required").url("Please enter a valid URL"),
});

type FormValues = z.infer<typeof formSchema>;

const AddWebLinkForm = ({
  hideWebLinkForm,
  projectId,
  userId,
}: {
  hideWebLinkForm: () => void;
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
        const res = await sendWeblink({ webLink: data.weblink, projectId, userId });
        showSuccess((res as any)?.message ?? "Website added successfully");
        if (projectId && userId) {
          dispatch(fetchDocs({ projectId, userId, roomId }));
          broadcastSourceUploaded();
        }
      } catch (error) {
        showError((error as Error)?.message ?? "Failed to add website");
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={hideWebLinkForm}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <MoveLeft size={15} />
        </button>
        <Label htmlFor="link" className="text-sm font-semibold">
          Paste a website link
        </Label>
      </div>

      <Textarea
        id="link"
        placeholder="https://example.com/article"
        className="resize-y min-h-[100px] mt-2 text-sm placeholder:text-sm"
        {...register("weblink")}
      />

      {errors.weblink && (
        <p className="text-red-500 text-xs mt-1">{errors.weblink.message}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          Add Website
        </Button>
      </div>
    </form>
  );
};

export default AddWebLinkForm;
