
'use client'

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BaseModal } from "../general/BaseModal";
import { z } from 'zod'
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { makeHttpReq } from "@/lib/helper/makeHttpReq";
import { fetchProjects, toggleModal } from "@/store/projectSlice";
import { showError, showSuccess } from "@/lib/utils";
import { Textarea } from "../ui/textarea";
import { toggleDocumentModal } from "@/store/docSlice";
import { fetchDocuments } from "@/store/aiEditorSlice";


const formSchema = z.object({
    title: z
        .string()
        .min(5, "Text must be at least 5 characters")
        .max(50, "Text is too long"),

    description: z
        .string()
        .min(20, "description must be at least 20 characters")
        .max(500, "description is too long"),

});


type formSchemaType = z.infer<typeof formSchema>;


export const DocumentModal = ({ session, projectId }: any) => {

    const dispatch = useDispatch<AppDispatch>();
    const { documentModal } = useSelector((state: RootState) => state.doc);
    const userId = session?.user?.id


    const {
        setValue,
        register,
        getValues,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<formSchemaType>({
        resolver: zodResolver(formSchema),
    });






    const onSubmit = async (data: formSchemaType) => {
        if (!projectId) {
            showError("Please open a project workspace first before creating a document.");
            return;
        }
        console.log(`[DocumentModal] creating doc "${data.title}" — projectId=${projectId} userId=${userId}`);
        try {
            const res = await makeHttpReq<{ title: string, description: string, userId: string, projectId: string }>(
                'POST', 'documents',
                {
                    userId,
                    projectId,
                    description: data?.description,
                    title: data?.title,
                }
            ) as { message: string };
            console.log(`[DocumentModal] create OK:`, res?.message);
            reset();
            dispatch(fetchDocuments({ projectId, userId }));
            showSuccess(res?.message);
        } catch (error) {
            console.error(`[DocumentModal] create FAILED:`, (error as Error)?.message);
            showError((error as Error)?.message);
        }
    };

    return (
        <div>

            <BaseModal
                open={documentModal}
                onOpenChange={() => dispatch(toggleDocumentModal())}
                title="Create Document"
                description=""
                width={500}
                height={380}
                footer={
                    <>

                    </>
                }
            >
                <form onSubmit={handleSubmit(onSubmit)} >

                    <div className="grid gap-3 p-3 ">
                        <Input  {...register("title")}
                            className="placeholder:text-xs"
                            id="title-1" name="title"
                            placeholder="Title... "
                        />
                        {errors.title && <p className="text-red-500 text-xs ">{errors.title.message}</p>}
                    </div>


                    <div className="grid gap-3 p-3 ">
                        <Textarea  {...register("description")}
                            className="placeholder:text-xs"
                            id="description-1" name="description"
                            placeholder="Description... "
                        />
                        {errors.description && <p className="text-red-500 text-xs ">{errors.description.message}</p>}
                    </div>




                    <div className="flex justify-between">
                        <div></div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => dispatch(toggleDocumentModal())}>
                                Cancel
                            </Button>
                            <Button className="cursor-pointer" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Create"
                                )}
                            </Button>
                        </div>
                    </div>
                </form>

            </BaseModal>
        </div>

    );
}

