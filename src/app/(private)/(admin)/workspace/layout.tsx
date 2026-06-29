import { authOptions } from "@/lib/auth/authOptions";
import { startAgenda } from "@/lib/agenda/agenda";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import React from "react";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // Start background job processor — non-fatal if it fails
  try {
    await startAgenda();
  } catch (err) {
    console.error("startAgenda failed:", err);
  }

  if (!session?.user) {
    redirect("/login");
  }

  return <div>{children}</div>;
}
