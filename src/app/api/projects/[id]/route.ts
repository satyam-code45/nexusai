

    import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/mongodb/withErrorHandler";
import { withAuth } from "@/lib/mongodb/withAuth";
import { ProjectService } from "@/services/ProjectService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export const PUT = withAuth(async (req: Request, ctx: RouteContext<'/api/projects/[id]'>) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const { name } = body;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;

  const projectService = ProjectService.getInstance();
  await projectService.updateProjects({ id, name, userId });

  return NextResponse.json({ message: "Project updated" });
});

export const DELETE = withAuth(async (req: Request, ctx: RouteContext<'/api/projects/[id]'>) => {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;

  const projectService = ProjectService.getInstance();
  await projectService.deleteProject({ id, userId });

  return NextResponse.json({ message: "Project deleted" });
});
