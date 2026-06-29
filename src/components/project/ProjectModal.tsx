'use client'

import { Input } from "../ui/input";
import { z } from 'zod'
import { Loader2, X, FolderPlus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { AppDispatch, RootState } from "@/store";
import { useSession } from "next-auth/react";
import { makeHttpReq } from "@/lib/helper/makeHttpReq";
import { fetchProjects, toggleModal } from "@/store/projectSlice";
import { showError, showSuccess } from "@/lib/utils";

const formSchema = z.object({
  name: z
    .string()
    .min(5, "Name must be at least 5 characters")
    .max(50, "Name is too long"),
});

type formSchemaType = z.infer<typeof formSchema>;

export const ProjectModal = ({ session }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { modal, currentProject } = useSelector((state: RootState) => state.project);

  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const userId = activeSession?.user?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (currentProject?.edit) {
      reset({ name: currentProject.name || "" });
    } else {
      reset({ name: "" });
    }
  }, [currentProject, reset]);

  const close = () => dispatch(toggleModal());

  const onSubmit = async (data: formSchemaType) => {
    try {
      const res = await makeHttpReq<{ name: string; userId: string }>(
        'POST', 'projects', { userId, name: data.name }
      ) as { message: string };
      reset();
      dispatch(fetchProjects({ page: 1, search: "", userId }));
      dispatch(toggleModal());
      showSuccess(res?.message);
    } catch (error) {
      showError((error as Error)?.message);
    }
  };

  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--l-tint)]">
              <FolderPlus size={15} className="text-[var(--l-moss)]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {currentProject?.edit ? "Rename project" : "New project"}
            </h2>
          </div>
          <button
            onClick={close}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <Input
              {...register("name")}
              id="project-name"
              placeholder="e.g. Research Sprint, Q3 Analysis…"
              autoFocus
              className="h-10"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--l-moss)] text-white text-sm font-medium hover:bg-[var(--l-moss2)] disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? (
                <><Loader2 size={14} className="animate-spin" /> Creating…</>
              ) : (
                currentProject?.edit ? "Save" : "Create project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
