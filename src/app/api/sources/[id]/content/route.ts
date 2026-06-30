import { withAuth } from "@/lib/mongodb/withAuth";
import { KnowledgeBase } from "@/models/KnowledgeBase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { isRoomMemberForProject } from "@/lib/mongodb/roomAccess";

export const GET = withAuth(async (req: Request, context: any) => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id: docId } = await (context.params as Promise<{ id: string }>);
    if (!docId) {
        return new Response("Missing id", { status: 400 });
    }

    const doc = await KnowledgeBase.findOne({ _id: docId }).select("content userId projectId").lean() as any;

    if (!doc?.content) {
        return new Response("Not found", { status: 404 });
    }

    // Allow access if the user owns the document or is a room member for its project
    if (doc.userId?.toString() !== userId) {
        const allowed = await isRoomMemberForProject(userId, doc.projectId?.toString());
        if (!allowed) {
            return new Response("Forbidden", { status: 403 });
        }
    }

    return new Response(doc.content as string, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "private, max-age=3600",
        },
    });
});
