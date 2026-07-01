import { withAuth } from "@/lib/mongodb/withAuth";
import { NexusPageService } from "@/services/NexusPageService";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export const POST = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, workspaceKey, title, tiptapJson, html } = await req.json();

  if (!projectId || !workspaceKey) {
    return NextResponse.json({ error: "Missing projectId or workspaceKey" }, { status: 400 });
  }

  console.log(`[workspace/save] key="${workspaceKey}" projectId=${projectId} userId=${userId} htmlLen=${html?.length ?? 0}`);

  const svc = NexusPageService.getInstance();
  await svc.upsertContent({ workspaceKey, projectId, userId, title, tiptapJson, html });

  return NextResponse.json({ message: "Saved" });
});
