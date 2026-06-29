import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "./mongodb";

export function withAuth<T extends (...args: any[]) => Promise<Response>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        console.error("[withAuth] 401 — session.user is null/undefined (token.userId may be missing; try signing out and back in)");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      await connectDB();
      return await fn(...args);
    } catch (error: any) {
      console.error("❌ Server error:", error.message);

      const status = error?.status || 500;
      const message = status < 500 ? (error?.message || "Bad request") : "Internal server error";
      return NextResponse.json({ error: message }, { status });
    }
  }) as T;
}
