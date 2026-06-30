import { reportsModel } from "@/lib/llm/agentModels";
import { loadDocumentOrContent } from "@/lib/loaders/doc-loaders";
import { generateSummary } from "@/lib/pipelines/summary-pipeline";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";

export async function updateOrCreateSummary(_id: string, userId: string, projectId: string) {
    try {
        const llm = reportsModel;
        const docRepo = KnowLedgeBaseService.getInstance();

        const doc = await docRepo.getSingleDoc({ _id: _id, userId, projectId })
        if (!doc) throw new Error('No document found')

        if (!doc.fileUrl) throw new Error("Document has no file URL — re-upload the file to continue.");

        const splittingDocs = await loadDocumentOrContent(doc.fileUrl, doc.content as string, 3000, 300)
        const summary = await generateSummary(llm, splittingDocs)

        await docRepo.updateSummary({ docId: _id, userId, projectId, summary: summary?.finalSummary as string })

        console.log('finished generating summary')
    } catch (error) {
        throw new Error(`Failed to generate summary ${(error as Error)?.message}`)
    }
}
