import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoveLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchDocs } from "@/store/docSlice";
import { toggleAddSourceModal } from "@/store/projectSlice";
import { sendTextData } from "@/lib/api/addsource";
import { showError, showSuccess } from "@/lib/utils";
import { useEditorCollab } from "@/contexts/EditorCollabContext";

const pasteTextSchema = z.object({
    text: z
        .string()
        .min(50, "Text must be at least 50 characters")
        .max(5000, "Text is too long"),
});

type PasteTextFormValues = z.infer<typeof pasteTextSchema>;

export const AddPasteTextForm = ({ hidePasteTextForm, projectId, userId }: { hidePasteTextForm: () => void, projectId?: string, userId: string }) => {

    const dispatch = useDispatch<AppDispatch>();
    const { activeRoom } = useSelector((state: RootState) => state.room);
    const roomId = activeRoom?.roomId;
    const { broadcastSourceUploaded } = useEditorCollab();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<PasteTextFormValues>({
        resolver: zodResolver(pasteTextSchema),
    });

    const onSubmit = (data: PasteTextFormValues) => {
        // Close modal immediately — process in background
        dispatch(toggleAddSourceModal());
        reset();

        (async () => {
            try {
                const res = await sendTextData({ text: data.text, projectId, userId });
                showSuccess((res as any)?.message ?? "Text added successfully");
                if (projectId && userId) {
                  dispatch(fetchDocs({ projectId, userId, roomId }));
                  broadcastSourceUploaded();
                }
            } catch (error) {
                showError((error as Error)?.message ?? "Failed to add text");
            }
        })();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="flex gap-2 items-center">
                <button
                    type="button"
                    onClick={hidePasteTextForm}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                    <MoveLeft size={15} />
                </button>
                <Label htmlFor="text" className="text-sm font-semibold">
                    Paste a Text
                </Label>
            </div>

            <Textarea
                id="text"
                {...register("text")}
                className="resize-none h-[220px] mt-2 text-sm placeholder:text-sm overflow-y-auto"
                placeholder="Paste text here"
            />
            {errors.text && <p className="text-red-500 text-xs mt-1">{errors.text.message}</p>}
            <div className="flex">
                <div></div>
                <div></div>
                <div className="ml-auto">
                    <Button type="submit">
                        Submit
                    </Button>
                </div>
            </div>
        </form>
    );
}
