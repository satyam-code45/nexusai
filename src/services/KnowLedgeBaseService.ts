import { KnowledgeBase } from "@/models/KnowledgeBase";
import { Types } from "mongoose";
import { isRoomMemberForProject } from "@/lib/mongodb/roomAccess";

interface IcreateDoc {
  fileName: string;
  userId: string;
  projectId: string;
  title?: string;
  source_type?: string;
  fileUrl?: string;
  content?: string;
}

export class KnowLedgeBaseService {
  private static instance: KnowLedgeBaseService;

  public static getInstance(): KnowLedgeBaseService {
    if (!KnowLedgeBaseService.instance) {
      KnowLedgeBaseService.instance = new KnowLedgeBaseService();
    }
    return KnowLedgeBaseService.instance;
  }

  async createDoc(docProps: IcreateDoc) {
    const doc = new KnowledgeBase({ ...docProps });
    const newDoc = await doc.save();
    return newDoc.toObject();
  }

  async updateSummary(props: { docId: any; userId: string; projectId: string; summary: string }) {
    const { userId, docId, projectId } = props;
    const row = await KnowledgeBase.findOneAndUpdate(
      { _id: docId, projectId, userId },
      { $set: { summary: props.summary } },
      { new: true, runValidators: true }
    );
    if (!row) throw new Error("No doc found");
    return row;
  }

  async updateStudyGuide(props: { docId: any; userId: string; projectId: string; studyGuide: string }) {
    const { userId, docId, projectId } = props;
    const row = await KnowledgeBase.findOneAndUpdate(
      { _id: docId, projectId, userId },
      { $set: { studyGuide: props.studyGuide } },
      { new: true, runValidators: true }
    );
    if (!row) throw new Error("No doc found");
    return row;
  }

  async updateFaq(props: { docId: any; userId: string; projectId: string; faq: string }) {
    const { userId, docId, projectId } = props;
    const row = await KnowledgeBase.findOneAndUpdate(
      { _id: docId, projectId, userId },
      { $set: { faq: props.faq } },
      { new: true, runValidators: true }
    );
    if (!row) throw new Error("No doc found");
    return row;
  }

  async updateBriefing(props: { docId: any; userId: string; projectId: string; briefing: string }) {
    const { userId, docId, projectId } = props;
    const row = await KnowledgeBase.findOneAndUpdate(
      { _id: docId, projectId, userId },
      { $set: { briefing: props.briefing } },
      { new: true, runValidators: true }
    );
    if (!row) throw new Error("No doc found");
    return row;
  }

  async updateMindMap(props: { userId: string; docId: Types.ObjectId; projectId: string; mindMap: string }) {
    const { userId, docId, projectId } = props;
    const row = await KnowledgeBase.findOneAndUpdate(
      { userId, _id: docId, projectId },
      { $set: { mindMap: props.mindMap } },
      { new: true, runValidators: true }
    );
    if (!row) throw new Error("No doc found");
    return row;
  }

  async getSingleDoc(props: { _id: string; projectId: string; userId?: string }) {
    const filter: Record<string, any> = { _id: props._id, projectId: props.projectId };
    if (props.userId) filter.userId = props.userId;
    return KnowledgeBase.findOne(filter);
  }

  async getDocsForProject(props: { projectId: string; userId?: string }) {
    const filter: Record<string, any> = { projectId: props.projectId };
    if (props.userId) filter.userId = props.userId;
    return KnowledgeBase.find(filter);
  }

  async updateFileUrl(props: { docId: string; fileUrl: string }) {
    await KnowledgeBase.findByIdAndUpdate(props.docId, { $set: { fileUrl: props.fileUrl } });
  }

  async setEmbeddingStatus(props: { docId: string; status: "pending" | "embedded" | "failed"; error?: string }) {
    await KnowledgeBase.findByIdAndUpdate(props.docId, {
      $set: { status: props.status, embeddingError: props.error ?? null },
    });
  }

  async deleteDoc(props: { id: string; projectId: string; userId: string }) {
    const doc = await KnowledgeBase.findOne({ _id: props.id, projectId: props.projectId });
    if (!doc) throw new Error("Document not found");

    // Owner can always delete; otherwise fall back to room-membership check
    // (same authorization pattern used for reading a shared doc's content —
    // see src/app/api/sources/[id]/content/route.ts) so collaborators in a
    // shared room can delete sources another member uploaded.
    if (doc.userId?.toString() !== props.userId) {
      const allowed = await isRoomMemberForProject(props.userId, props.projectId);
      if (!allowed) throw new Error("Document not found or unauthorized");
    }

    await KnowledgeBase.deleteOne({ _id: props.id });
    return doc;
  }
}
