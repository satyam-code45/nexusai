import { utilityModel } from "@/lib/llm/agentModels";
import { readChatHistoryByFilter } from "@/lib/tools/ChatHistoryTools";
import { getSuggestedQuestionsTool } from "@/lib/tools/suggestedQuestionTool";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getProjectFilter } from "@/lib/mongodb/roomAccess";

export const GET = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") as string;
  const roomId = searchParams.get("roomId") || undefined;

  if (!projectId) {
    return NextResponse.json({ ok: false, message: "projectId is required" }, { status: 400 });
  }

  // In a room: return all members' messages. Outside a room: personal only.
  const filter = await getProjectFilter(userId, projectId, roomId);

  const llm = utilityModel;

  const [messages, questionsResult] = await Promise.allSettled([
    readChatHistoryByFilter(filter),
    getSuggestedQuestionsTool.invoke({ userId, projectId, llm }),
  ]);

  if (messages.status === "rejected") {
    console.error("[chat-history] failed to load messages:", messages.reason);
    return NextResponse.json({ messages: [], questions: [] });
  }

  const questions = questionsResult.status === "fulfilled" ? questionsResult.value : [];

  return NextResponse.json({ messages: messages.value, questions });
});
