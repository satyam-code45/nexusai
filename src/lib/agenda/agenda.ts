import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { docEmbeddingMultiVector } from "../pipelines/multi-vector";


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



agenda.define("docEmbedding", async (job: any) => {
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
});




export async function startAgenda() {
  if (!agenda.isActiveJobProcessor()) {
    await agenda.start();
    console.log("✅ Agenda started");
  }
}


