import { withAuth } from "@/lib/mongodb/withAuth";
import { NexusPageService } from "@/services/NexusPageService";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { ProjectService } from "@/services/ProjectService";
import { RoomService } from "@/services/RoomService";

export const GET = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceKey = searchParams.get("workspaceKey") || "";

  if (!workspaceKey) {
    return NextResponse.json({ error: "Missing workspaceKey" }, { status: 400 });
  }

  // Verify the caller owns or is a member of the resource identified by workspaceKey.
  // workspaceKey is either a projectId (personal workspace) or a roomId (collaborative room).
  let authorized = false;
  try {
    const project = await ProjectService.getInstance().getSingleProject(workspaceKey, userId);
    authorized = !!project;
  } catch {}

  if (!authorized) {
    try {
      await RoomService.getInstance().getRoom(workspaceKey, userId);
      authorized = true;
    } catch {}
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = NexusPageService.getInstance();
  const page = await svc.getPage(workspaceKey);

  // Serialize the raw Yjs binary state as base64 so the client can pre-populate
  // the ydoc before the editor mounts — eliminates the stray-paragraph-on-reload race.
  const yjsRaw = (page as any)?.yjsState;
  let yjsStateB64: string | null = null;
  if (yjsRaw) {
    try {
      const buf = Buffer.isBuffer(yjsRaw)
        ? yjsRaw
        : yjsRaw?.buffer
          ? Buffer.from(yjsRaw.buffer, yjsRaw.byteOffset ?? 0, yjsRaw.position ?? yjsRaw.byteLength)
          : Buffer.from(yjsRaw);
      yjsStateB64 = buf.toString("base64");
    } catch {
      // Non-fatal — editor falls back to tiptapJson
    }
  }

  return NextResponse.json({
    html:        (page as any)?.html       ?? "",
    tiptapJson:  (page as any)?.tiptapJson ?? null,
    title:       (page as any)?.title      ?? "",
    yjsStateB64,
  });
});
