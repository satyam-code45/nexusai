"use client"
import { Button } from "@/components/ui/button";
import type { AppDispatch, RootState } from "@/store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import { BaseModal } from "../general/BaseModal";
import { toggleViewReportModal } from "@/store/docSlice";




export const ViewReportModal = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { viewReportModal, showViewReportModal } = useSelector((state: RootState) => state.doc);
  const isPodcast = viewReportModal?.source_type === 'podcast';

  return (
    <div>
      <BaseModal
        open={showViewReportModal}
        onOpenChange={() => dispatch(toggleViewReportModal())}
        title={`${viewReportModal?.source_type} - sources (${viewReportModal?.total_source})`}
        description=""
        width={800}
        height={600}
      >
        <div className="grid gap-3">
          {isPodcast ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                <span className="text-4xl">🎙</span>
              </div>
              <p className="text-center text-sm text-muted-foreground max-w-md">
                AI-generated podcast discussion of your selected sources. Two hosts, Alex and Sam, explore the key ideas together.
              </p>
              <audio
                controls
                className="w-full max-w-lg rounded-lg"
                src={viewReportModal?.content}
              >
                Your browser does not support the audio element.
              </audio>
              <a
                href={viewReportModal?.content}
                download
                className="text-xs text-[var(--l-moss)] hover:underline"
              >
                Download MP3
              </a>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              a: ({ node, ...props }) => (
                <a className="text-blue-500 underline hover:text-blue-700" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc ml-6 mb-2" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal ml-6 mb-2" {...props} />
              ),
              li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-foreground my-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-foreground my-2" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
            }}>
              {`${viewReportModal?.content}`}
            </ReactMarkdown>
          )}
        </div>
      </BaseModal>
    </div>
  );
}

