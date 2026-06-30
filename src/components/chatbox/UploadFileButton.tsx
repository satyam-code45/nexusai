"use client";

import { useState, useRef, ReactNode } from "react";
import { Paperclip, ImageIcon, Loader2, Plus, Globe } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
 import { cn } from "@/lib/utils";
import { toggleAddSourceModal } from "@/store/projectSlice";


export const UploadFileButton = ({
  projectId,
  loading,
  triggerFileInput,
  inputFile
}: {

  projectId: string;
  loading: boolean

  triggerFileInput: (...args: any[]) => void
  inputFile: ReactNode

}) => {


  const dispatch = useDispatch()

  return (

<div className="flex items-center gap-3 text-muted-foreground">
  {/* Hidden file input */}
  {inputFile}

  {/* Add source button */}
  <button
    disabled={!projectId}
    onClick={() => dispatch(toggleAddSourceModal())}
    className={cn(
      "p-1.5 rounded-full transition-colors duration-200",
      "bg-muted hover:bg-muted/80 text-foreground hover:text-foreground",
      !projectId && "opacity-50 cursor-not-allowed"
    )}
  >
    <Plus size={16} />
  </button>

  {/* Image upload button */}
  <button
    disabled={!projectId || loading}
    onClick={triggerFileInput}
    className={cn(
      "p-1.5 rounded-full transition-colors duration-200",
      "text-foreground hover:text-foreground hover:bg-muted",
      (!projectId || loading) && "opacity-50 cursor-not-allowed"
    )}
  >
    {loading ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      <ImageIcon size={16} />
    )}
  </button>
</div>
  );
};

export default UploadFileButton;
