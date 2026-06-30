import mongoose, { model, models } from "mongoose";

const shortTermMemorySchema = new mongoose.Schema({
  message: { type: String, required: true },
  userId: { type: String, required: true },
  projectId: { type: String, required: true },
}, { timestamps: true });

shortTermMemorySchema.index({ userId: 1, projectId: 1 });

export const ShortTermMemory = models.ShortTermMemory || model("ShortTermMemory", shortTermMemorySchema);
