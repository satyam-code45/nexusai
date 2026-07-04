import { Agenda, backoffStrategies } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { docEmbeddingMultiVector } from "../pipelines/multi-vector";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";


declare global {

  var _agenda: Agenda | undefined;
}

export const agenda =
  global._agenda ??
  new Agenda({
    backend: new MongoBackend({
      address: process.env.MONGODB_URI!,
      collection: "jobs",
    }),
  });

if (process.env.NODE_ENV !== "production") {
  global._agenda = agenda;
}



agenda.define(
  "docEmbedding",
  async (job: any) => {
    const { filePath, content, userId, projectId } = job.attrs.data as any;
    console.log("🎨 Starting document embedding");

    if (content) {
      // Text-based sources (youtube transcript, weblink, pasted text) — content is already extracted
      await docEmbeddingMultiVector({ rawTexts: [content], userId, projectId });
    } else {
      // Binary/file sources (pdf, docx, etc.) — load from Cloudinary URL
      await docEmbeddingMultiVector({ urls: [filePath], userId, projectId });
    }

    console.log("finish embedding");
  },
  {
    // Transient failures (rate limits, network blips) get retried automatically
    // before we give up and mark the source as failed.
    backoff: backoffStrategies.exponential({ delay: 2000, factor: 2, maxRetries: 3 }),
  }
);

// Central place that flips a KnowledgeBase doc's status once its embedding
// job resolves — keeps this logic out of every route that enqueues a job.
agenda.on("success:docEmbedding", async (job: any) => {
  const { docId } = job.attrs.data as any;
  if (!docId) return;
  await KnowLedgeBaseService.getInstance().setEmbeddingStatus({ docId, status: "embedded" });
});

agenda.on("retry exhausted:docEmbedding", async (error: Error, job: any) => {
  const { docId } = job.attrs.data as any;
  if (!docId) return;
  console.error("❌ docEmbedding retries exhausted:", error);
  await KnowLedgeBaseService.getInstance().setEmbeddingStatus({
    docId,
    status: "failed",
    error: error?.message || "Embedding failed",
  });
});




export async function startAgenda() {
  if (!agenda.isActiveJobProcessor()) {
    await agenda.start();
    console.log("✅ Agenda started");
  }
}


