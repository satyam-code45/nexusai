import { withAuth } from "@/lib/mongodb/withAuth";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getProjectFilter } from "@/lib/mongodb/roomAccess";

export const DELETE = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const projectId = searchParams.get("projectId") || "";

  if (!id || !projectId) {
    return NextResponse.json({ error: "id and projectId are required" }, { status: 400 });
  }

  const svc = KnowLedgeBaseService.getInstance();
  await svc.deleteDoc({ id, projectId, userId });
  return NextResponse.json({ success: true });
});

export const GET = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const sessionUserId = session!.user!.id as string;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "";
  const roomId = searchParams.get("roomId") || undefined;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const filter = await getProjectFilter(sessionUserId, projectId, roomId);
  const projectService = KnowLedgeBaseService.getInstance();
  const docs = await projectService.getDocsForProject(filter);

  return NextResponse.json({ docs });
});
