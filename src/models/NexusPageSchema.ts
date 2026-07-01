import mongoose, { model, models } from "mongoose";

/**
 * Single unified collection for all editor content.
 *
 * workspaceKey is the Yjs room name — either:
 *   - roomId   (collaborative session shared by all room members)
 *   - projectId (personal/team workspace for a project)
 *
 * tiptapJson is the ProseMirror document tree — a Notion-style block model
 * where every node carries a `type` (paragraph, heading, image, video, table,
 * codeBlock, bulletList, …), `attrs`, `content` (children), and `marks`.
 *
 * yjsState is the binary Yjs CRDT update — loaded on WS connect, saved on
 * WS disconnect. The Yjs server and HTTP save route both upsert this same doc.
 */
const NexusPageSchema = new mongoose.Schema(
  {
    workspaceKey: { type: String, required: true, unique: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },

    title: { type: String, default: "Untitled" },

    // Block tree — ProseMirror JSON (Notion-style block model)
    tiptapJson: { type: mongoose.Schema.Types.Mixed, default: null },

    // Rendered HTML — kept for quick preview and AI context window
    html: { type: String, default: "" },

    // Binary Yjs CRDT state — real-time collaboration source of truth
    yjsState: { type: Buffer, default: null },

    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    editCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

NexusPageSchema.index({ projectId: 1 });

export const NexusPage =
  models.NexusPage || model("NexusPage", NexusPageSchema);
