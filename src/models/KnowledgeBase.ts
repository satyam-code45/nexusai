import mongoose, { model, models } from "mongoose";

const knowledgeBaseSchema = new mongoose.Schema({
  title: { type: String },
  fileName: { type: String },
  fileUrl: { type: String },
  // Inline text content for sources that don't need Cloudinary (youtube/weblink/text paste)
  content: { type: String },
  summary: { type: String },
  studyGuide: { type: String },
  mindMap: { type: String },
  faq: { type: String },
  briefing: { type: String },
  source_type: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true }

}, { timestamps: true });

knowledgeBaseSchema.index({ userId: 1, projectId: 1 });

export const KnowledgeBase = models.KnowledgeBase || model("KnowledgeBase", knowledgeBaseSchema);