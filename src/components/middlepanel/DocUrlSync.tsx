"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { updateDocumentContent } from "@/store/aiEditorSlice";
import { makeHttpReq } from "@/lib/helper/makeHttpReq";
import { showError } from "@/lib/utils";
import type { UserDocument } from "@/lib/api/projects";

// Watches the ?doc= query param and loads the corresponding document into Redux.
// Handles browser back/forward navigation automatically.
export function DocUrlSync() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc");
  const dispatch = useDispatch<AppDispatch>();
  const { selectedDocument } = useSelector((state: RootState) => state.aiEditor);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!docId) return;
    if (docId === selectedDocument._id) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    makeHttpReq("GET", `documents/single-doc?docId=${docId}`)
      .then((data: any) => {
        dispatch(updateDocumentContent((data as { document: UserDocument }).document));
      })
      .catch(() => showError("Failed to load page"))
      .finally(() => { loadingRef.current = false; });
  }, [docId]);

  return null;
}
