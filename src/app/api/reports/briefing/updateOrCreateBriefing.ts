import { reportsModel } from "@/lib/llm/agentModels";
import { loadDocumentOrContent } from "@/lib/loaders/doc-loaders";
import { generateBriefing } from "@/lib/pipelines/briefing-pipeline";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";

export async function updateOrCreateBriefing(_id: string, userId: string, projectId: string) {
    try {
        const llm = reportsModel;
        const docRepo = KnowLedgeBaseService.getInstance();

        const doc = await docRepo.getSingleDoc({ _id: _id, userId, projectId })
        if (!doc) throw new Error('No document found')

        if (!doc.fileUrl) throw new Error("Document has no file URL — re-upload the file to continue.");

        const splittingDocs = await loadDocumentOrContent(doc.fileUrl, doc.content as string, 3000, 300)
        const briefing = await generateBriefing(llm, splittingDocs)

        if (!briefing?.finalBriefing) throw new Error("Briefing pipeline returned no output — document may have no extractable text.");

        await docRepo.updateBriefing({ docId: _id, userId, projectId, briefing: briefing.finalBriefing })

        console.log('finished generating briefing doc')
    } catch (error) {
        throw new Error(`Failed to generate briefing ${(error as Error)?.message}`)
    }
}
