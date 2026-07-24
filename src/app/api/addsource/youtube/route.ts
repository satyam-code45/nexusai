
import { NextResponse } from "next/server";
import { utilityModel } from "@/lib/llm/agentModels";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { getSubtitles } from 'youtube-caption-extractor';
import { Document } from "@langchain/core/documents";
import { inngest } from "@/inngest/client";
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
            const errMessage = err instanceof Error ? err.message : String(err);
            console.error("Transcript fetch failed:", errMessage);

            // Give an accurate message per failure mode instead of always blaming
            // the video's caption settings — that's often not the real cause.
            let message: string;
            if (errMessage.startsWith("INVALID_URL")) {
                message = "That doesn't look like a valid YouTube video link.";
            } else if (errMessage.startsWith("NO_CAPTIONS")) {
                message = "This video has no captions (manual or auto-generated) — there's no transcript to read.";
            } else if (errMessage.includes("not playable on any client")) {
                // YouTube sometimes blocks/rate-limits requests from datacenter IPs
                // (Vercel, AWS Lambda) — this is almost never actually about captions.
                message = "Could not reach this video right now — YouTube may be temporarily rate-limiting our server. Please try again in a minute, or try a different video.";
            } else {
                message = "Could not retrieve this video's transcript. Please try again in a moment.";
            }

            return NextResponse.json({ message }, { status: 400 });
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

        await inngest.send({
            name: "doc/embedding.requested",
            data: { docId: String(newDoc._id), content: transcript, fileUrl, userId, projectId },
        });

        return NextResponse.json({ message: "Document saved successfully" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error", error: String(error) }, { status: 500 });
    }
});

async function fetchYoutubeDocs(url: string): Promise<Document[]> {
    // Match only real video ID patterns: ?v=ID, /shorts/ID, or bare /ID at end of path
    const videoIdMatch = url.match(/(?:[?&]v=|\/shorts\/)([a-zA-Z0-9_-]{11})(?:[&?/]|$)/)
      ?? url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?/]|$)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : "";

    if (!videoId) {
        throw new Error("INVALID_URL: Could not extract video ID from the link.");
    }

    // YouTube sometimes rate-limits/blocks requests from datacenter IPs (Vercel,
    // AWS Lambda) transiently — retry once before giving up. A genuinely
    // caption-less video won't fix itself on retry, so we skip retrying that case.
    const MAX_ATTEMPTS = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });

            if (!subtitles || subtitles.length === 0) {
                throw new Error("NO_CAPTIONS: No caption tracks exist on this video.");
            }

            const fullText = subtitles.map(sub => sub.text).join(' ');

            return [
                new Document({
                    pageContent: fullText,
                    metadata: { source: url, source_type: 'youtube', videoId }
                })
            ];
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[youtube] transcript attempt ${attempt}/${MAX_ATTEMPTS} failed:`, message);

            if (message.startsWith("NO_CAPTIONS")) break;
            if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1200));
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
