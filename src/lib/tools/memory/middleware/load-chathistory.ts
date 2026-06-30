import { connectDB } from "@/lib/mongodb/mongodb";
import { ChatHistory } from "@/models/ChatHistorySchema";

export async function LoadChatHistory({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<string> {
  try {
    await connectDB();
    const history = await ChatHistory.find({ userId, projectId })
      .sort({ createdAt: -1 })
      .limit(7)
      .lean();

    if (!history.length) return "<user_chat_history></user_chat_history>";

    const contentOnly = history
      .reverse()
      .map((item: any) => {
        const role = item.role?.toUpperCase() === "AI" ? "AI" : "USER";
        return `${role}: ${item.content}`;
      })
      .join("\n");

    return `
────────────────────────────────────────────
CHAT_HISTORY (RECENT MESSAGES)
────────────────────────────────────────────
<user_chat_history>${contentOnly}</user_chat_history>
`;
  } catch {
    return "<user_chat_history></user_chat_history>";
  }
}
