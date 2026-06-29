import { withAuth } from "@/lib/mongodb/withAuth";
import { withErrorHandler } from "@/lib/mongodb/withErrorHandler";
import { ProjectService } from "@/services/ProjectService";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";


export const GET = withAuth(async (req: Request) => {
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";

  // Use session identity — never trust caller-supplied userId
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });
  }

  const lowerCaseVal=search.toLocaleLowerCase()
  const projectService = ProjectService.getInstance();
  const projects = await projectService.getAllProjects({search:lowerCaseVal,page:page,limit,userId})

  return NextResponse.json({projects });
});

export const POST = withAuth(async (req: Request) => {
  const body = await req.json();
  const { name, emoji } = body;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const projectService = ProjectService.getInstance();
  const project = await projectService.createProject({ name, userId,emoji });

  return NextResponse.json({ message: "Project created", project });
});

