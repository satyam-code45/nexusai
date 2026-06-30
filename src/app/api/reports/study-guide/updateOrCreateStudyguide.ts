import { reportsModel } from "@/lib/llm/agentModels";
import { loadDocumentOrContent } from "@/lib/loaders/doc-loaders";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { generateStudyguide } from "@/lib/pipelines/study-guide-pipeline";

export async function updateOrCreateStudyguide(_id: string, userId: string, projectId: string) {
    try {
        const llm = reportsModel;
        const docRepo = KnowLedgeBaseService.getInstance();

        const doc = await docRepo.getSingleDoc({ _id: _id, userId, projectId })
        if (!doc) throw new Error('No document found')

        if (!doc.fileUrl) throw new Error("Document has no file URL — re-upload the file to continue.");

        const splittingDocs = await loadDocumentOrContent(doc.fileUrl, doc.content as string, 4000, 400)
        const studyguide = await generateStudyguide(llm, splittingDocs)

        await docRepo.updateStudyGuide({ docId: _id, userId, projectId, studyGuide: studyguide?.finalStudyGuide as string })

        console.log('finished generating studyguide')
    } catch (error) {
        throw new Error(`Failed to generate studyguide ${(error as Error)?.message}`)
    }
}
