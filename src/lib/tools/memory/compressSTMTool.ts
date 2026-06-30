import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { countTokensApproximately } from "langchain";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

const MAX_STM_TOKENS = 2000;
const KEEP_RECENT_MESSAGES = 10;

// Summarization model
const summarizer = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  apiKey: process.env.OPENAI_API_KEY,
});

async function getVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
  });

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);

  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    maxConcurrency: 5,
  });
}

export const compressSTMTool = tool(
  async ({ messages, userId,projectId }) => {
    // Token count
    const tokenCount = countTokensApproximately(
      messages.map((m) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      )
    );
    if (tokenCount <= MAX_STM_TOKENS) {
      return {
        compressed: false,
        messages,
      };
    }

    // Split messages
    const cutoff = Math.max(messages.length - KEEP_RECENT_MESSAGES, 0);
    const oldMessages = messages.slice(0, cutoff);
    const recentMessages = messages.slice(cutoff);

    const textToSummarize = oldMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    // Summarize
    const summaryRes = await summarizer.invoke([
      new SystemMessage("Summarize the following content."),
      new HumanMessage(textToSummarize),
    ]);

    const rawSummaryContent = summaryRes?.content
    const summaryText = typeof rawSummaryContent === "string"
      ? rawSummaryContent
      : rawSummaryContent.map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join("");
    // Save to Pinecone
    const vectorStore = await getVectorStore();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([summaryText], [{
      userId,
      projectId,
      source: "stm_summary",
    }]);

    await vectorStore.addDocuments(docs);

    // Build compressed STM messages
    const compressedMessages = [
      {
        role: "system",
        content: `__STM_COMPRESSED__\n${summaryText}`,
      },
      ...recentMessages,
    ];

    return JSON.stringify({
      compressed: true,
      messages: compressedMessages,
    });
  },
  {
    name: "compress_stm",
    description:
      "Compress the short-term memory. Summarizes old messages, stores summary in vector DB, and returns compressed STM.",
    schema: z.object({
      messages: z.array(
        z.object({
          role: z.string(),
          content: z.string(),
        })
      ),
      userId: z.string(),
      projectId: z.string(),

    }),
  }
);


