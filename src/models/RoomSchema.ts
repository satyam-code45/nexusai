import mongoose, { model, models } from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    passwordHash: { type: String, required: true },
    password: { type: String, required: true },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
        role: { type: String, enum: ["owner", "editor", "viewer"], default: "editor" },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export const Room = models.Room || model("Room", roomSchema);
