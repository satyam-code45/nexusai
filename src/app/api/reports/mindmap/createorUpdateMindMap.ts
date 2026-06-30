import { reportsModel } from "@/lib/llm/agentModels";
import { loadDocumentOrContent } from "@/lib/loaders/doc-loaders";
import { generateMindMap } from "@/lib/pipelines/mindmap-pipeline";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { Types } from "mongoose";

export async function createorUpdateMindMap(_id: string, userId: string, projectId: string) {
    try {
        const llm = reportsModel;
        const docRepo = KnowLedgeBaseService.getInstance();

        const doc = await docRepo.getSingleDoc({ _id, userId, projectId });
        if (!doc) throw new Error('No document found');
        if (!doc.fileUrl) throw new Error("Document has no file URL — re-upload the file to continue.");

        const splittingDocs = await loadDocumentOrContent(doc.fileUrl, doc.content as string, 1000, 200);
        const text = splittingDocs.map((d) => d.pageContent).join("\n\n");
        const mindMapJson = await generateMindMap(llm, text);

        await docRepo.updateMindMap({
            docId: doc._id as Types.ObjectId,
            userId,
            projectId,
            mindMap: mindMapJson,
        });

        console.log('[createorUpdateMindMap] finished');
    } catch (error) {
        console.error('[createorUpdateMindMap]', error);
        throw error;
    }
}
