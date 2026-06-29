import { NextResponse } from "next/server";
import { connectDB } from "./mongodb";

export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      await connectDB();
      return await fn(...args);
    } catch (error: any) {
      console.error("❌ Server error:", error.message);
  

        // Never leak raw internal errors (connection strings, schema details, etc.)
        const message = "Internal Server Error";

      return NextResponse.json(
        { error: message },
        { status: error?.status || 500 }
      );
      
    }
  }) as T;
}

