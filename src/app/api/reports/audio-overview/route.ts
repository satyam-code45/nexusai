import { NextResponse } from "next/server";
import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { SourceService } from "@/services/SourceService";
import { reportsModel } from "@/lib/llm/agentModels";
import { generatePodcastScript } from "@/lib/pipelines/audio-pipeline";
import { uploadBufferToCloudinary } from "@/lib/uploadToCloudinary";
import { generateTitle } from "@/lib/helper/generateDocTitle";
import { Document } from "@langchain/core/documents";
import OpenAI from "openai";

const VOICE_MAP: Record<string, OpenAI.Audio.Speech.SpeechCreateParams["voice"]> = {
  Alex: "alloy",
  Sam: "nova",
};

// OpenAI TTS — max 4096 chars per request
async function textToSpeechBuffer(
  openai: OpenAI,
  text: string,
  voice: OpenAI.Audio.Speech.SpeechCreateParams["voice"]
): Promise<Buffer> {
  // Chunk if the text is very long
  const MAX_CHARS = 4000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHARS) {
    chunks.push(text.slice(i, i + MAX_CHARS));
  }

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: chunk,
      response_format: "mp3",
    });
    buffers.push(Buffer.from(await response.arrayBuffer()));
  }
  return Buffer.concat(buffers);
}

export const POST = withAuth(async (req: Request) => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session!.user!.id as string;

    const { projectId, docIds } = await req.json() as {
      projectId: string;
      docIds: string[];
    };

    if (!projectId || !Array.isArray(docIds) || docIds.length === 0) {
      return NextResponse.json(
        { message: "Missing projectId or docIds" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "Audio Overview requires OPENAI_API_KEY to be configured." },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llm = reportsModel;
    const docRepo = KnowLedgeBaseService.getInstance();
    const sourceRepo = SourceService.getInstance();

    // Collect summaries for selected docs (generate if missing)
    const summaries: Array<{ title?: string | null; summary?: string | null }> = [];
    for (const docId of docIds) {
      const doc = await docRepo.getSingleDoc({ _id: docId, projectId });
      if (!doc) continue;

      // Use existing summary or fall back to truncated content
      summaries.push({
        title: doc.title || doc.fileName,
        summary: doc.summary || doc.studyGuide || "(No summary available)",
      });
    }

    if (summaries.length === 0) {
      return NextResponse.json(
        { message: "No documents found. Generate summaries first." },
        { status: 400 }
      );
    }

    // Generate podcast script
    const script = await generatePodcastScript(llm, summaries);

    // Generate TTS audio for all turns in parallel, then reassemble in order
    const audioParts = await Promise.all(
      script.map((turn) => {
        const voice = VOICE_MAP[turn.speaker] ?? "alloy";
        return textToSpeechBuffer(openai, turn.text, voice);
      })
    );

    const fullAudio = Buffer.concat(audioParts);

    // Upload to Cloudinary
    const { url: audioUrl } = await uploadBufferToCloudinary(fullAudio, {
      folder: "nexusai/podcasts",
      resourceType: "video", // Cloudinary uses 'video' for audio files
    });

    // Generate a title
    const titleDoc = new Document({ pageContent: summaries.map((s) => s.title).join(", ") });
    const title = await generateTitle(llm, [titleDoc]);

    // Create Source record — store the Cloudinary audio URL in content
    await sourceRepo.createSource({
      userId,
      projectId,
      title: `Audio Overview: ${title}`,
      source_type: "podcast",
      content: audioUrl,
      total_source: docIds.length,
    });

    return NextResponse.json(
      { message: "Audio overview created successfully", audioUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("[audio-overview] error:", error);
    return NextResponse.json(
      { message: "Failed to generate audio overview", error: String(error) },
      { status: 500 }
    );
  }
});
