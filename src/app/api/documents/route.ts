import { withAuth } from "@/lib/mongodb/withAuth";
import { NexusPageService } from "@/services/NexusPageService";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

// Returns pages for a project — used by the left-panel documents list
export const GET = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ documents: [] });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "";
  if (!projectId) return NextResponse.json({ documents: [] });

  const svc = NexusPageService.getInstance();
  const pages = await svc.listByProject(projectId);
  return NextResponse.json({ documents: pages });
});
