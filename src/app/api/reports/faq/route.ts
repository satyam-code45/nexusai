import { NextResponse } from "next/server"
import { updateOrCreateFaq } from "./updateOrCreateFaq"
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
        const docWithoutFaq = [] as any

        for (const docId of docIds) {
            const doc = await docRepo.getSingleDoc({ _id: docId, projectId })

            if (!doc) continue;
            if (!doc.faq) {
                docWithoutFaq.push({
                    projectId: doc.projectId,
                    userId: doc.userId,
                    docId: doc._id
                })
            }
        }

        // FAQ generation
        for (const docW of docWithoutFaq) {
            await updateOrCreateFaq(docW?.docId, docW?.userId, docW?.projectId)
        }


        return NextResponse.json(
            { status: 'ready_to_generate_source' },
            { status: 200 }
        );


    } catch (error) {

        return NextResponse.json({ message: "Failed to generate FAQ", error: String(error) }, { status: 500 });

    }

});
