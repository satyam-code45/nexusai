import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb/mongodb";
import { ShortTermMemory } from "@/models/ShortTermMemorySchema";

export const writeShortHistoryTool = tool(
  async ({ userId, projectId, message }) => {
    await connectDB();
    await ShortTermMemory.create({ userId, projectId, message });
    const count = await ShortTermMemory.countDocuments({ userId, projectId });
    return { status: "saved", length: count };
  },
  {
    name: "write_short_history",
    description: "Store a short-term user message for context history.",
    schema: z.object({
      userId: z.string(),
      message: z.string(),
      projectId: z.string(),
    }),
  }
);

export const readShortHistoryTool = tool(
  async ({ userId, projectId }) => {
    await connectDB();
    const entries = await ShortTermMemory.find({ userId, projectId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return JSON.stringify(entries.reverse());
  },
  {
    name: "read_short_history",
    description: "Read the short-term memory (last messages) for a specific user.",
    schema: z.object({
      userId: z.string(),
      projectId: z.string(),
    }),
  }
);
