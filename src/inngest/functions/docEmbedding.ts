import { inngest } from "@/inngest/client";
import { connectDB } from "@/lib/mongodb/mongodb";
import { docEmbeddingMultiVector } from "@/lib/pipelines/multi-vector";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";

type DocEmbeddingData = {
  docId: string;
  content?: string;
  filePath?: string;
  // The KnowledgeBase doc's own fileUrl (Cloudinary URL, or /api/sources/{id}/content
  // for DB-stored text sources) — must be threaded into the content branch so chunk
  // metadata.originalUrl matches what the retriever filters by; otherwise chat's
  // "scope to selected source" query matches nothing even though embedding "succeeds".
  fileUrl?: string;
  userId: string;
  projectId: string;
};

export const docEmbeddingFunction = inngest.createFunction(
  {
    id: "doc-embedding",
    retries: 3,
    triggers: [{ event: "doc/embedding.requested" }],
    // Runs once retries are exhausted — mirrors the old "retry exhausted:docEmbedding"
    // Agenda event. Inngest wraps the original event under event.data.event here.
    onFailure: async ({ event, error }) => {
      const { docId } = event.data.event.data as DocEmbeddingData;
      if (!docId) return;
      console.error("❌ docEmbedding retries exhausted:", error);
      await connectDB();
      await KnowLedgeBaseService.getInstance().setEmbeddingStatus({
        docId,
        status: "failed",
        error: error?.message || "Embedding failed",
      });
    },
  },
  async ({ event, step }) => {
    const { docId, content, filePath, fileUrl, userId, projectId } = event.data as DocEmbeddingData;

    // Inngest invokes this function via HTTP on Inngest's own infrastructure —
    // there's no shared mongoose connection with the Next.js app, so each run
    // must establish its own (connectDB() caches it, so this is cheap). Not
    // wrapped in step.run: mongoose's Connection object isn't JSON-serializable,
    // which is required for a step's checkpointed return value.
    await connectDB();

    await step.run("embed-document", async () => {
      if (content) {
        // Text-based sources (youtube transcript, weblink, pasted text, or a
        // PDF/docx whose text was already extracted upstream) — content is
        // already extracted. fileUrl must be passed through so the retriever's
        // "scope to selected source" filter can match this doc's chunks.
        await docEmbeddingMultiVector({ rawTexts: [content], fileUrl, userId, projectId });
      } else {
        // Binary/file sources (pdf, docx, etc.) — load from Cloudinary URL
        await docEmbeddingMultiVector({ urls: [filePath!], userId, projectId });
      }
    });

    await step.run("mark-embedded", () =>
      KnowLedgeBaseService.getInstance().setEmbeddingStatus({ docId, status: "embedded" }),
    );
  },
);
