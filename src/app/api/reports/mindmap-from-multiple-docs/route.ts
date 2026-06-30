import { NextResponse } from "next/server";
import { reportsModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { Document } from "@langchain/core/documents";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { SourceService } from "@/services/SourceService";
import { generateMindMap } from "@/lib/pipelines/mindmap-pipeline";
import { formatstudyguides, mergestudyguide } from "../studyguide-from-multiple-docs/studyguide-helper";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export const POST = withAuth(async (req: Request) => {
    try {


        const { userId, projectId, docIds } = await req.json()  as { userId: string, projectId: string, docIds: string[] }

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

        if(docIds.length === 0){
            return NextResponse.json(
                    { message: "select a source" },
                    { status: 400 }
                );
        }

        const llm = reportsModel;
        const sourceRepo = SourceService.getInstance()
        const docRepo = KnowLedgeBaseService.getInstance();


        const studyguides = [] as Array<{ title: string | null | undefined, studyguide: string }>

        for (const docId of docIds) {
            const doc = await docRepo.getSingleDoc({ _id: docId, projectId })
            if (!doc) continue;
            // skip docs whose mindmap precursor hasn't been generated yet
            if (!doc.mindMap) continue;
            studyguides.push({
                title: doc?.title,
                studyguide: doc.mindMap,
            })
        }


        if (studyguides.length > 0) {

            if (studyguides.length === 1) {

                const title = await generateTitle(llm, [new Document({ pageContent: studyguides[0]?.studyguide as string })])
                const mindMap = await generateMindMap(llm, studyguides[0]?.studyguide as string)
                // return doc studyguide
                await sourceRepo.createSource({
                    userId, projectId,
                    title,
                    source_type: 'mindMap',
                    content: mindMap,
                    total_source: 1
                })
               return  NextResponse.json({ message: "finished creating mindmap.." },{status:200})
                // finish

            } else {
                // pass that array to llm to create a single studyguide
                const countSource = studyguides.length
                const studyguideToStr = formatstudyguides(studyguides)

                const llmFinalstudyguide = await mergestudyguide({ countSource, llm, studyguideToStr }) as string

                const title = await generateTitle(llm, [new Document({ pageContent: studyguideToStr as string })])
                const mindMap = await generateMindMap(llm, llmFinalstudyguide)
                await sourceRepo.createSource({
                    userId, projectId,
                    title,
                    source_type: 'mindMap',
                    content: mindMap,
                    total_source: countSource
                })

                  return  NextResponse.json({ message: "finished creating mindmap" },{status:200})
            }


        }

        return NextResponse.json({ message: "No documents with study guides found" }, { status: 404 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
    }
});
