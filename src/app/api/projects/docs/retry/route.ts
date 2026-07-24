import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { withAuth } from "@/lib/mongodb/withAuth";
import { KnowledgeBase } from "@/models/KnowledgeBase";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { isRoomMemberForProject } from "@/lib/mongodb/roomAccess";
import { inngest } from "@/inngest/client";

export const POST = withAuth(async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const { id, projectId } = await req.json();
  if (!id || !projectId) {
    return NextResponse.json({ error: "id and projectId are required" }, { status: 400 });
  }

  const doc = await KnowledgeBase.findOne({ _id: id, projectId });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (doc.userId?.toString() !== userId) {
    const allowed = await isRoomMemberForProject(userId, projectId);
    if (!allowed) {
      return NextResponse.json({ error: "Document not found or unauthorized" }, { status: 404 });
    }
  }

  if (doc.status !== "failed") {
    return NextResponse.json({ error: "Only failed sources can be retried" }, { status: 400 });
  }

  const docRepo = KnowLedgeBaseService.getInstance();
  await docRepo.setEmbeddingStatus({ docId: id, status: "pending" });

  const ownerId = doc.userId.toString();
  if (doc.content) {
    await inngest.send({
      name: "doc/embedding.requested",
      data: { docId: id, content: doc.content, fileUrl: doc.fileUrl, userId: ownerId, projectId },
    });
  } else if (doc.fileUrl) {
    await inngest.send({
      name: "doc/embedding.requested",
      data: { docId: id, filePath: doc.fileUrl, userId: ownerId, projectId },
    });
  } else {
    await docRepo.setEmbeddingStatus({ docId: id, status: "failed", error: "Nothing to retry — no content or file reference stored" });
    return NextResponse.json({ error: "Nothing to retry for this source" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
});
