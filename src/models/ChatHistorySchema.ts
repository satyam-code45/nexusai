import mongoose, { model, models } from "mongoose";

const chatHistorySchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true },
  content: { type: String, required: true },
  thinking: { type: String },
  userId: { type: String, required: true },
  projectId: { type: String, required: true },
}, { timestamps: true });

chatHistorySchema.index({ userId: 1, projectId: 1, createdAt: -1 });

export const ChatHistory = models.ChatHistory || model("ChatHistory", chatHistorySchema);
