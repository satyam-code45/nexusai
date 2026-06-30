import mongoose, { model, models } from "mongoose";

const scratchpadSchema = new mongoose.Schema({
  fileName: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete after 1 hour
scratchpadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

export const Scratchpad = models.Scratchpad || model("Scratchpad", scratchpadSchema);
