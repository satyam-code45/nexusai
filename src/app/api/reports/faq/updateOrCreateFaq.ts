import { reportsModel } from "@/lib/llm/agentModels";
import { loadDocumentOrContent } from "@/lib/loaders/doc-loaders";
import { generateFaq } from "@/lib/pipelines/faq-pipeline";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";

export async function updateOrCreateFaq(_id: string, userId: string, projectId: string) {
    try {
        const llm = reportsModel;
        const docRepo = KnowLedgeBaseService.getInstance();

        const doc = await docRepo.getSingleDoc({ _id: _id, userId, projectId })
        if (!doc) throw new Error('No document found')

        if (!doc.fileUrl) throw new Error("Document has no file URL — re-upload the file to continue.");

        const splittingDocs = await loadDocumentOrContent(doc.fileUrl, doc.content as string, 3000, 300)
        const faq = await generateFaq(llm, splittingDocs)

        if (!faq?.finalFaq) throw new Error("FAQ pipeline returned no output — document may have no extractable text.");

        await docRepo.updateFaq({ docId: _id, userId, projectId, faq: faq.finalFaq })

        console.log('finished generating FAQ')
    } catch (error) {
        throw new Error(`Failed to generate FAQ ${(error as Error)?.message}`)
    }
}
