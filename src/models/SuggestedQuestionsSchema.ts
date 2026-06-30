import mongoose, { model, models } from "mongoose";

const suggestedQuestionsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  projectId: { type: String, required: true },
  questions: [{ type: String }],
}, { timestamps: true });

suggestedQuestionsSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export const SuggestedQuestions =
  models.SuggestedQuestions || model("SuggestedQuestions", suggestedQuestionsSchema);
