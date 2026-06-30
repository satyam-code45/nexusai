import mongoose, { model, models } from "mongoose";

const sourceSchema = new mongoose.Schema({
  title: { type: String },
  total_source: { type: Number },
  content: { type: String },
  source_type: { type: String },
  docId: { type: mongoose.Schema.Types.ObjectId, ref: "KnowledgeBase" },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

sourceSchema.index({ userId: 1, projectId: 1 });
sourceSchema.index({ docId: 1, source_type: 1, projectId: 1 }, { unique: false });

export const Source = models.Source || model("Source", sourceSchema);
  