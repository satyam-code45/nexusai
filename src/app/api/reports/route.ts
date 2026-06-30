import { withAuth } from "@/lib/mongodb/withAuth";
import { SourceService } from "@/services/SourceService";
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

  const svc = SourceService.getInstance();
  await svc.deleteSource({ id, projectId, userId });
  return NextResponse.json({ success: true });
});

export const GET = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const sessionUserId = session!.user!.id as string;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "";
  const roomId = searchParams.get("roomId") || undefined;

  if (!projectId) {
    return NextResponse.json({ message: "projectId is required" }, { status: 400 });
  }

  const filter = await getProjectFilter(sessionUserId, projectId, roomId);
  const sourceRepo = SourceService.getInstance();
  const sources = await sourceRepo.getAllSources(filter);

  return NextResponse.json({ sources });
});
