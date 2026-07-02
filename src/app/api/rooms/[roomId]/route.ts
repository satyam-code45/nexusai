import { NextResponse } from "next/server";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { RoomService } from "@/services/RoomService";

export const GET = withAuth(async (_req: Request, { params }: { params: Promise<{ roomId: string }> }) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;
  const { roomId } = await params;

  try {
    const svc = RoomService.getInstance();
    const room = await svc.getRoom(roomId, userId);
    return NextResponse.json({ room });
  } catch (err: any) {
    const status = err.status ?? 500;
    return NextResponse.json({ error: err.message ?? "Not found" }, { status });
  }
});

// PATCH /api/rooms/[roomId] — verify password against hash and save plaintext for display
export const PATCH = withAuth(async (req: Request, { params }: { params: Promise<{ roomId: string }> }) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;
  const { roomId } = await params;

  const body = await req.json().catch(() => null);
  if (!body?.password) return NextResponse.json({ error: "Password required" }, { status: 400 });

  try {
    const svc = RoomService.getInstance();
    await svc.savePassword(roomId, body.password, userId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err.status ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed" }, { status });
  }
});

export const DELETE = withAuth(async (_req: Request, { params }: { params: Promise<{ roomId: string }> }) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;
  const { roomId } = await params;

  try {
    const svc = RoomService.getInstance();
    await svc.deleteRoom(roomId, userId);
    return NextResponse.json({ message: "Room deleted" });
  } catch (err: any) {
    const status = err.status ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to delete" }, { status });
  }
});
