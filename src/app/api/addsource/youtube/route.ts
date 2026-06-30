
import { NextResponse } from "next/server";
import { after } from "next/server";
import { utilityModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { getSubtitles } from 'youtube-caption-extractor';
import { Document } from "@langchain/core/documents";
import { docEmbeddingMultiVector } from "@/lib/pipelines/multi-vector";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { formatDocumentsAsString, generateUniqueFileName } from "@/lib/utils";

export const POST = withAuth(async (req: Request) => {
    try {

        const { userId, projectId, youtubeLink } = await req.json();
        if (!userId || !projectId || !youtubeLink) {
            return NextResponse.json(
                { message: "Provide youtubeLink" },
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

        let docs: Document[];
        try {
            docs = await fetchYoutubeDocs(youtubeLink);
        } catch (err) {
            console.error("Transcript fetch failed:", err);
            return NextResponse.json(
                { message: "Could not retrieve transcript. Ensure captions are enabled on this video." },
                { status: 400 }
            );
        }

        const title = await generateTitle(llm, docs);
        const transcript = formatDocumentsAsString(docs);
        const fileName = generateUniqueFileName();

        const docRepo = KnowLedgeBaseService.getInstance();

        // Store transcript directly in MongoDB — no Cloudinary upload needed for text
        const newDoc = await docRepo.createDoc({
            fileName,
            content: transcript,
            userId: String(userId),
            title,
            projectId,
            source_type: 'youtube',
        });

        const fileUrl = `/api/sources/${newDoc._id}/content`;
        await docRepo.updateFileUrl({ docId: String(newDoc._id), fileUrl });

        after(async () => {
            try {
                await docEmbeddingMultiVector({ rawTexts: [transcript], fileUrl, userId, projectId });
                console.log("✅ YouTube transcript embedding complete");
            } catch (err) {
                console.error("❌ YouTube embedding failed:", err);
            }
        });

        return NextResponse.json({ message: "Document saved successfully" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
    }
});

async function fetchYoutubeDocs(url: string): Promise<Document[]> {
    try {
        // Match only real video ID patterns: ?v=ID, /shorts/ID, or bare /ID at end of path
        const videoIdMatch = url.match(/(?:[?&]v=|\/shorts\/)([a-zA-Z0-9_-]{11})(?:[&?/]|$)/)
          ?? url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?/]|$)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "";

        if (!videoId) {
            throw new Error("Invalid YouTube URL. Could not extract Video ID.");
        }

        const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });

        if (!subtitles || subtitles.length === 0) {
            throw new Error("No subtitles found. Captions might be disabled on this video.");
        }

        const fullText = subtitles.map(sub => sub.text).join(' ');

        return [
            new Document({
                pageContent: fullText,
                metadata: { source: url, source_type: 'youtube', videoId }
            })
        ];

    } catch (error) {
        console.error("Caption Extractor Error:", error);
        throw new Error(`Failed to fetch transcript: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
