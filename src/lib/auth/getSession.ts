
  // src/lib/auth.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";

// helper function
export const getSession = async() =>await  getServerSession(authOptions);
