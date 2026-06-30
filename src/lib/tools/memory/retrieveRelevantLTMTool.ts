import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";

async function getVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const pinecone = new PineconeClient({
    apiKey: process.env.PINECONE_API_KEY as string,
  });

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX  as string);

  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    maxConcurrency: 5,
  });
}

export const retrieveRelevantLTMTool = tool(
  async ({ query, userId,projectId, topK }) => {
    const vectorStore = await getVectorStore();

    const results = await vectorStore.similaritySearch(query, topK, { userId,projectId });

    if (!results.length) {
      return "No relevant long-term memory found.";
    }

    const formatted = results
      .map(
        (doc, i) =>
          `Memory #${i + 1} (source: ${doc.metadata.source}):\n${doc.pageContent}`
      )
      .join("\n\n");

    return formatted;
  },
  {
    name: "retrieve_relevant_ltm",
    description:
      "Retrieve relevant long-term memory entries for the given query. Returns summarized context.",
    schema: z.object({
      query: z.string(),
      userId: z.string(),
      projectId: z.string(),

      topK: z.number().default(5),
    }),
  }
);


