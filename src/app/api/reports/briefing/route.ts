import { NextResponse } from "next/server"
import { updateOrCreateBriefing } from "./updateOrCreateBriefing"
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";


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


        const docRepo = KnowLedgeBaseService.getInstance();
        const docWithoutBriefing = [] as any

        for (const docId of docIds) {
            const doc = await docRepo.getSingleDoc({ _id: docId, projectId })

            if (!doc) continue;
            if (!doc.briefing) {
                docWithoutBriefing.push({
                    projectId: doc.projectId,
                    userId: doc.userId,
                    docId: doc._id
                })
            }
        }

        // Briefing generation
        for (const docW of docWithoutBriefing) {
            await updateOrCreateBriefing(docW?.docId, docW?.userId, docW?.projectId)
        }


        return NextResponse.json(
            { status: 'ready_to_generate_source' },
            { status: 200 }
        );


    } catch (error) {

        return NextResponse.json({ message: "Failed to generate briefing", error: String(error) }, { status: 500 });

    }

});
