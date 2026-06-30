import { withAuth } from "@/lib/mongodb/withAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { memoryAndConversationalAgent } from "@/lib/multi-doc-agent/MemoryAgent";
import { statusContext } from "@/lib/multi-doc-agent/statusContext";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb/mongodb";
import { KnowledgeBase } from "@/models/KnowledgeBase";
import { ChatHistory } from "@/models/ChatHistorySchema";

// Allow up to 5 minutes for multi-agent pipelines on Vercel/serverless platforms
export const maxDuration = 300;

const streamRequestSchema = z.object({
  message: z.string().min(1),
  projectId: z.string().min(1),
  docUrls: z.array(z.string()).optional(),
});

const STREAM_TIMEOUT_MS = 300_000; // 5 minutes

export const POST = withAuth(async (req: Request) => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session!.user!.id as string;

    const body = await req.json();
    const parsed = streamRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message, projectId, docUrls } = parsed.data;

    // Fast check: skip the whole research pipeline if the project has no documents
    await connectDB();
    const docCount = docUrls?.length
      ? 1 // caller already selected specific docs — treat as "has documents"
      : await KnowledgeBase.countDocuments({ projectId });
    const hasDocuments = docCount > 0;

    // Resolve @mention source scoping
    let resolvedMessage = message;
    const mentionMatches = message.match(/@([\w\s.()-]{2,60}?)(?=\s|$|[?!.,])/g);
    if (mentionMatches?.length) {
      try {
        const mentionNames = mentionMatches.map((m: string) => m.slice(1).trim());
        // Escape regex metacharacters so user input can't break the MongoDB query
        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mentionedDocs = await KnowledgeBase.find({
          $or: mentionNames.flatMap((name: string) => [
            { title: { $regex: escapeRegex(name), $options: 'i' } },
            { fileName: { $regex: escapeRegex(name), $options: 'i' } },
          ]),
          projectId,
        }, { title: 1, fileName: 1, fileUrl: 1 }).lean();

        if (mentionedDocs.length > 0) {
          const docList = mentionedDocs
            .map((d: any) => `"${d.title || d.fileName}" → docUrl: "${d.fileUrl}"`)
            .join(', ');
          resolvedMessage = message + `\n\n[SYSTEM NOTE: The user referenced specific source(s) via @mention. When using the retriever tool, you MUST pass the docUrl parameter to scope retrieval to the mentioned document only. Mentioned documents: ${docList}]`;
        }
      } catch {
        // Non-fatal — fall through with unmodified message
      }
    }

    // Inject selected-source restriction (sidebar checkboxes) into the message context
    if (docUrls && docUrls.length > 0) {
      resolvedMessage += `\n\n[SYSTEM NOTE: The user has selected ${docUrls.length} specific source(s) to query.
RULES — follow strictly:
1. Call MainResearcherAgent and pass the docUrls parameter: ${JSON.stringify(docUrls)}
2. Do NOT use readImageTool, readFileTool, or any other tool to access these URLs directly.
3. The content is already in the vector database — use the retriever only.
4. Base your answer ONLY on what the retriever returns for these sources.
5. If the retriever returns nothing relevant, respond with exactly: "I couldn't find that information in the selected source(s). The document may not cover this topic, or try rephrasing your question."
6. Do NOT answer from general knowledge.]`;
    }

    const agent = memoryAndConversationalAgent({ userId, projectId, hasDocuments });
    const encoder = new TextEncoder();

    const sse = (event: string, data: any) =>
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    await ChatHistory.insertMany([{ role: "user", content: message, userId, projectId }]).catch((e) =>
      console.error("[stream] failed to save user message:", e)
    );

    let streamingText = "";
    let thinkingBuffer = "";
    let inThinking = false;

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;

        const close = () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        };

        const timeoutId = setTimeout(() => {
          controller.enqueue(sse("error", { error: "Request timed out" }));
          close();
        }, STREAM_TIMEOUT_MS);

        try {
          // Run agent inside the status ALS context so middleware and sub-agents
          // can emit user-facing status messages via statusContext.getStore()?.()
          await statusContext.run(
            (statusMsg: string) => {
              if (!closed) controller.enqueue(sse("status", { status: statusMsg }));
            },
            async () => {
              for await (const chunk of await agent.stream(
                { messages: [{ role: "user", content: resolvedMessage }] },
                { streamMode: "updates" }
              )) {
                if (closed) break;

                const updates = chunk?.tools?.messages;
                const req = chunk?.model_request?.messages;

                if (updates?.length > 0) {
                  thinkingBuffer += updates[0].content;
                  controller.enqueue(sse("thinking", { thinking: updates[0].content }));
                }

                if (req?.length > 0) {
                  const rawContent = req[0]?.content ?? "";
                  const content =
                    typeof rawContent === "string"
                      ? rawContent
                      : rawContent.map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join("");

                  const parts = content.split(/(<think>|<\/think>)/);
                  parts.forEach((part: string) => {
                    if (part === "<think>") {
                      inThinking = true;
                    } else if (part === "</think>") {
                      inThinking = false;
                    } else if (part.length > 0) {
                      if (inThinking) {
                        thinkingBuffer += part;
                        controller.enqueue(sse("thinking", { thinking: part }));
                      } else {
                        streamingText += part;
                        controller.enqueue(sse("message", { message: part }));
                      }
                    }
                  });
                }
              }
            }
          );

          clearTimeout(timeoutId);
          if (!closed) {
            // Safety net: reasoning models sometimes produce thinking-only output with no text
            if (!streamingText && thinkingBuffer) {
              const fallback = "I processed your request but wasn't able to generate a response. Please try again.";
              controller.enqueue(sse("message", { message: fallback }));
              streamingText = fallback;
            }
            // Save AI message to DB BEFORE sending the end event so it's persisted
            // before the client's reader.cancel() can abort the serverless lambda.
            await ChatHistory.insertMany([{ role: "ai", thinking: thinkingBuffer, content: streamingText, userId, projectId }]).catch((e) =>
              console.error("[stream] failed to save AI message:", e)
            );
            controller.enqueue(sse("end", { ok: true }));
            close();
          }
        } catch (error) {
          clearTimeout(timeoutId);
          console.error("Stream error:", (error as Error)?.message);
          // Persist whatever partial AI response was accumulated before the failure
          if (streamingText) {
            await ChatHistory.insertMany([{ role: "ai", thinking: thinkingBuffer, content: streamingText, userId, projectId }]).catch(() => {});
          }
          if (!closed) {
            controller.enqueue(sse("error", { error: "Stream failed" }));
            close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
