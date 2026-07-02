import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { withAuth } from "@/lib/mongodb/withAuth";
import { createHmac } from "crypto";

const WS_SECRET = process.env.WS_SECRET ?? "";
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// GET /api/workspace/ws-token?workspaceKey=xxx
// Returns a signed HMAC token for WebSocket authentication.
// The y-websocket server validates it with the same secret.
export const GET = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceKey = searchParams.get("workspaceKey");

  if (!workspaceKey) {
    return NextResponse.json({ error: "workspaceKey is required" }, { status: 400 });
  }

  // When WS_SECRET is not set the server accepts all connections anyway,
  // so return a dummy token that won't be checked.
  if (!WS_SECRET) {
    return NextResponse.json({ token: "", exp: 0 });
  }

  const exp = Date.now() + TOKEN_TTL_MS;
  const token = createHmac("sha256", WS_SECRET)
    .update(`${workspaceKey}:${exp}`)
    .digest("hex");

  return NextResponse.json({ token, exp });
});
