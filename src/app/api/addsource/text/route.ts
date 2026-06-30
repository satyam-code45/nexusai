import { NextResponse } from "next/server";
import { after } from "next/server";
import { utilityModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { Document } from "@langchain/core/documents";
import { generateUniqueFileName } from "@/lib/utils";
import { docEmbeddingMultiVector } from "@/lib/pipelines/multi-vector";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export const POST = withAuth(async (req: Request) => {
    try {

        const { userId, projectId, text } = await req.json();

        if (!userId || !projectId) {
            return NextResponse.json(
                { message: "Missing userId or projectId" },
                { status: 400 }
            );
        }

        if (!text || typeof text !== "string" || text.trim().length === 0) {
            return NextResponse.json(
                { message: "text field is required and must be non-empty" },
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

        const llm = utilityModel;
        const title = await generateTitle(llm, [new Document({ pageContent: text })]);

        const fileName = generateUniqueFileName();
        const docRepo = KnowLedgeBaseService.getInstance();

        // Store content directly in MongoDB — no Cloudinary upload needed for plain text
        const newDoc = await docRepo.createDoc({
            fileName,
            content: text,
            userId: String(userId),
            title,
            projectId,
            source_type: 'text',
        });

        const fileUrl = `/api/sources/${newDoc._id}/content`;
        await docRepo.updateFileUrl({ docId: String(newDoc._id), fileUrl });

        after(async () => {
            try {
                await docEmbeddingMultiVector({ rawTexts: [text], fileUrl, userId, projectId });
                console.log("✅ Text embedding complete");
            } catch (err) {
                console.error("❌ Text embedding failed:", err);
            }
        });

        return NextResponse.json({ message: "Document saved successfully" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
    }
});
