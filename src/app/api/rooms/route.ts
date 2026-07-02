import { NextResponse } from "next/server";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { RoomService } from "@/services/RoomService";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  password: z.string().min(4).max(100),
  projectId: z.string().min(1),
});

// POST /api/rooms — create a room
export const POST = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const svc = RoomService.getInstance();
    const room = await svc.createRoom({ ...parsed.data, ownerId: userId });
    return NextResponse.json({ room }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to create room" }, { status: 500 });
  }
});

// GET /api/rooms — list rooms, or ?projectId=xxx to get the room for a specific project
export const GET = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  try {
    const svc = RoomService.getInstance();

    if (projectId) {
      const room = await svc.getRoomForProject(userId, projectId);
      return NextResponse.json({ room });
    }

    const rooms = await svc.getUserRooms(userId);
    return NextResponse.json({ rooms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch rooms" }, { status: 500 });
  }
});
