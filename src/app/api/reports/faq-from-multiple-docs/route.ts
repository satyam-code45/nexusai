import { NextResponse } from "next/server";
import { reportsModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { Document } from "@langchain/core/documents";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { SourceService } from "@/services/SourceService";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";


function formatFaqs(faqs: Array<{ title?: string | null; faq?: string | null }>): string {
    return faqs
        .map((item) => `title:${item.title ?? ""},faq:${item.faq ?? ""}`)
        .join("--==|==--");
}

async function mergeAndDeduplicateFaqs(props: { llm: any; countSource: number; faqsToStr: string }) {
    const { llm, countSource, faqsToStr } = props;

    const mergePrompt = ChatPromptTemplate.fromMessages([
        [
            "user",
            `You are a professional technical writer. Your task is to merge the following ${countSource} FAQ lists into a single, polished FAQ document.
Each FAQ list is separated by the marker: "--==|==--".

Input FAQ lists:
{context}

Output requirements:

1. Produce a final FAQ list of 8-15 questions total.
2. Remove duplicate or near-duplicate questions — keep the best-worded version with the most complete answer.
3. Format every Q&A pair exactly as:
   **Q:** <question>
   **A:** <answer>
4. Order questions from most fundamental to most specific.
5. Preserve all important details from the original answers.
6. Keep the tone factual, neutral, and professional.
7. Output only the final FAQ list in Markdown — no preamble or explanation outside the list.`,
        ],
    ]);

    const prompt = await mergePrompt.invoke({ context: faqsToStr });
    const response = await llm.invoke(prompt);
    return response?.content as string;
}


export const POST = withAuth(async (req: Request) => {
    try {

        const { userId, projectId, docIds } = await req.json() as { userId: string, projectId: string, docIds: string[] }

        if (!userId || !projectId) {
            return NextResponse.json(
                { message: "Missing userId or projectId" },
                { status: 400 }
            );
        }

        const session = await getServerSession(authOptions);
        if (session?.user?.id !== userId) {
            return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (docIds.length === 0) {
            return NextResponse.json(
                { message: "select a source" },
                { status: 400 }
            );
        }

        const llm = reportsModel;
        const sourceRepo = SourceService.getInstance();
        const docRepo = KnowLedgeBaseService.getInstance();
        const faqs = [] as Array<{ docId: string; title: string | null | undefined; faq: string | null | undefined }>

        for (const docId of docIds) {

            const doc = await docRepo.getSingleDoc({ _id: docId, projectId })

            if (doc?.faq) {
                faqs.push({
                    docId,
                    title: doc.title,
                    faq: doc.faq,
                })
            }

        }

        if (faqs.length > 0) {

            if (faqs.length === 1) {

                const title = await generateTitle(llm, [new Document({ pageContent: faqs[0]?.faq as string })])

                await sourceRepo.upsertSource({
                    userId, projectId,
                    title,
                    source_type: 'FAQ',
                    content: faqs[0]?.faq as string,
                    total_source: 1,
                    docId: faqs[0].docId,
                })

                return NextResponse.json(
                    { message: "finished creating FAQ" },
                    { status: 200 }
                );

            } else {

                const countSource = faqs.length;
                const faqsToStr = formatFaqs(faqs);

                const mergedFaq = await mergeAndDeduplicateFaqs({ countSource, llm, faqsToStr });

                const title = await generateTitle(llm, [new Document({ pageContent: faqsToStr as string })])

                await sourceRepo.createSource({
                    userId, projectId,
                    title,
                    source_type: 'FAQ',
                    content: mergedFaq,
                    total_source: countSource
                })

                return NextResponse.json({ message: "finished creating FAQ" }, { status: 200 })
            }

        }

        return NextResponse.json({ message: "No documents with FAQs found" }, { status: 404 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
    }
});
