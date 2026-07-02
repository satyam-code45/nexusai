import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { withAuth } from "@/lib/mongodb/withAuth";
import { RoomService } from "@/services/RoomService";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

// PUT /api/rooms/[roomId]/members/[memberId] — update a member's role (owner only)
export const PUT = withAuth(async (
  req: Request,
  { params }: { params: Promise<{ roomId: string; memberId: string }> }
) => {
  try {
    const session = await getServerSession(authOptions);
    const requestingUserId = session!.user!.id as string;
    const { roomId, memberId } = await params;

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await RoomService.getInstance().updateMemberRole({
      roomId,
      targetUserId: memberId,
      newRole: parsed.data.role,
      requestingUserId,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err.message }, { status });
  }
});

// GET /api/rooms/[roomId]/members/[memberId] — get a member's role
export const GET = withAuth(async (
  _req: Request,
  { params }: { params: Promise<{ roomId: string; memberId: string }> }
) => {
  try {
    const session = await getServerSession(authOptions);
    const requestingUserId = session!.user!.id as string;
    const { roomId, memberId } = await params;

    // Only the room members can query roles
    const room = await RoomService.getInstance().getRoom(roomId, requestingUserId);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const role = await RoomService.getInstance().getMemberRole(roomId, memberId);
    if (!role) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({ role });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err.message }, { status });
  }
});
