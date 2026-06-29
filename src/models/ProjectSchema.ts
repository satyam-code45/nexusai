
import mongoose, { model, models } from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, required: false },
  emoji: { type: String, required: false },

}, { timestamps: true });


export const Project = models.Project || model("Project", projectSchema);
  