import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb/mongodb";
import { ChatHistory } from "@/models/ChatHistorySchema";

export const messageSchema = z.object({
  role: z.enum(["user", "ai"]),
  userId: z.string(),
  projectId: z.string(),
  content: z.string(),
  thinking: z.string().optional(),
});

export const writeToChatHistoryTool = tool(
  async ({ messages }) => {
    try {
      await connectDB();
      await ChatHistory.insertMany(messages);
      return "Chat history written successfully.";
    } catch (error) {
      console.error("[writeToChatHistoryTool] error:", error);
      return "Failed to write chat history.";
    }
  },
  {
    name: "write_memory",
    description: "Write conversation to chat-history",
    schema: z.object({
      messages: z.array(messageSchema),
    }),
  }
);

/** Direct query for chat history — used by the API route when room-scoped access is needed. */
export async function readChatHistoryByFilter(filter: { userId?: string; projectId: string }) {
  await connectDB();
  const docs = await ChatHistory.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  return docs.reverse();
}

export const readChatHistoryTool = tool(
  async ({ userId, projectId }) => {
    try {
      await connectDB();
      const history = await ChatHistory.find({ userId, projectId })
        .sort({ createdAt: 1 })
        .limit(50)
        .lean();
      return JSON.stringify(history);
    } catch (error) {
      console.error("❌ Memory read error:", error);
      return "[]";
    }
  },
  {
    name: "read_memory",
    description: "Retrieve chat history entries for a given user",
    schema: z.object({
      userId: z.string(),
      projectId: z.string(),
    }),
  }
);
