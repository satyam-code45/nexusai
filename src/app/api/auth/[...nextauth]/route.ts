import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Re-export for the handful of server-only callers that used to import
// authOptions directly from this route file.
export { authOptions };
