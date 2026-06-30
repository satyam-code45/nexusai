
import { NextResponse } from "next/server";
import { after } from "next/server";
import { utilityModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { getDocChunk } from "@/lib/helper/getDocChunk";
import { docEmbeddingMultiVector } from "@/lib/pipelines/multi-vector";
import { loadWeb } from "@/lib/loaders/doc-loaders";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { formatDocumentsAsString, generateUniqueFileName } from "@/lib/utils";


export const POST = withAuth(async (req: Request) => {
    try {

        const { userId, projectId, webLink } = await req.json();
        if (!userId || !projectId || !webLink) {
            return NextResponse.json(
                { message: "Missing userId / projectId / weblink" },
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

        const docSplit = await loadWeb(webLink);
        const content = formatDocumentsAsString(docSplit);
        const firstChunk = getDocChunk(docSplit);
        const title = await generateTitle(llm, firstChunk);

        const fileName = generateUniqueFileName();
        const docRepo = KnowLedgeBaseService.getInstance();

        // Store scraped content directly in MongoDB — no Cloudinary upload needed for text
        const newDoc = await docRepo.createDoc({
            fileName,
            content,
            userId: String(userId),
            title,
            projectId,
            source_type: 'weblink',
        });

        const fileUrl = `/api/sources/${newDoc._id}/content`;
        await docRepo.updateFileUrl({ docId: String(newDoc._id), fileUrl });

        after(async () => {
            try {
                await docEmbeddingMultiVector({ rawTexts: [content], fileUrl, userId, projectId });
                console.log("✅ Weblink embedding complete");
            } catch (err) {
                console.error("❌ Weblink embedding failed:", err);
            }
        });

        return NextResponse.json({ message: "Document uploaded successfully" }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
    }
});
