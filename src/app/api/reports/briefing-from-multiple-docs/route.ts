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


function formatBriefings(briefings: Array<{ title?: string | null; briefing?: string | null }>): string {
    return briefings
        .map((item) => `title:${item.title ?? ""},briefing:${item.briefing ?? ""}`)
        .join("--==|==--");
}

async function mergeAndCombineBriefings(props: { llm: any; countSource: number; briefingsToStr: string }) {
    const { llm, countSource, briefingsToStr } = props;

    const mergePrompt = ChatPromptTemplate.fromMessages([
        [
            "user",
            `You are a professional executive communications writer. Your task is to merge the following ${countSource} executive briefing documents into a single, unified executive brief.
Each briefing is separated by the marker: "--==|==--".

Input briefings:
{context}

Output requirements:

Produce a single executive briefing document with these sections:

## Overview
A 2-4 sentence high-level summary covering all source documents.

## Key Points
A consolidated bullet list of the most important facts, data, and context from all documents. Remove duplicates.

## Decisions / Findings
A consolidated bullet list of all conclusions, significant findings, and determinations. Remove duplicates.

## Action Items
A consolidated bullet list of all tasks, next steps, and recommendations. Remove duplicates. If none, write "No specific action items identified."

Rules:
- Use **bold** to highlight critical terms or values.
- Keep the tone professional, neutral, and concise.
- Output only Markdown — no preamble or explanation outside the document.`,
        ],
    ]);

    const prompt = await mergePrompt.invoke({ context: briefingsToStr });
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
        const briefings = [] as Array<{ docId: string; title: string | null | undefined; briefing: string | null | undefined }>

        for (const docId of docIds) {

            const doc = await docRepo.getSingleDoc({ _id: docId, projectId })

            if (doc?.briefing) {
                briefings.push({
                    docId,
                    title: doc.title,
                    briefing: doc.briefing,
                })
            }

        }

        if (briefings.length > 0) {

            if (briefings.length === 1) {

                const title = await generateTitle(llm, [new Document({ pageContent: briefings[0]?.briefing as string })])

                await sourceRepo.upsertSource({
                    userId, projectId,
                    title,
                    source_type: 'Briefing',
                    content: briefings[0]?.briefing as string,
                    total_source: 1,
                    docId: briefings[0].docId,
                })

                return NextResponse.json(
                    { message: "finished creating briefing" },
                    { status: 200 }
                );

            } else {

                const countSource = briefings.length;
                const briefingsToStr = formatBriefings(briefings);

                const mergedBriefing = await mergeAndCombineBriefings({ countSource, llm, briefingsToStr });

                const title = await generateTitle(llm, [new Document({ pageContent: briefingsToStr as string })])

                await sourceRepo.createSource({
                    userId, projectId,
                    title,
                    source_type: 'Briefing',
                    content: mergedBriefing,
                    total_source: countSource
                })

                return NextResponse.json({ message: "finished creating briefing" }, { status: 200 })
            }

        }

        return NextResponse.json({ message: "No documents with briefings found" }, { status: 404 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
    }
});
