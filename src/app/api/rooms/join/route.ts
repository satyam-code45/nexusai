import { NextResponse } from "next/server";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { RoomService } from "@/services/RoomService";
import { z } from "zod";

const joinSchema = z.object({
  roomId: z.string().min(1).max(20),
  password: z.string().min(1).max(100),
});

export const POST = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const svc = RoomService.getInstance();
    const room = await svc.joinRoom({ ...parsed.data, userId });
    return NextResponse.json({ room }, { status: 200 });
  } catch (err: any) {
    const status = err.status ?? 500;
    return NextResponse.json({ error: err.message ?? "Failed to join room" }, { status });
  }
});
