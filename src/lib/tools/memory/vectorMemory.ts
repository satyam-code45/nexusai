import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";



async function createVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const pinecone = new PineconeClient({
    apiKey: process.env.PINECONE_API_KEY as string,
  });

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    maxConcurrency: 5,
  });

  return { vectorStore };
}


export const saveVectorMemoryTool = tool(
  async ({ text, userId,projectId,  }) => {
    const { vectorStore } = await createVectorStore();

    // 1. Convert text → Document object
    const doc = new Document({
      pageContent: text,
      metadata: { userId,projectId, source: "user_memory" },
    });

    // 2. Chunking
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments([doc]);

    // 3. Insert into Pinecone
    await vectorStore.addDocuments(chunks);

    return JSON.stringify({
      status: "saved",
      chunks: chunks.length,
    });
  },
  {
    name: "save_vector_memory",
    description:
      "Save long-term memory chunks into a vector database (Pinecone).",
    schema: z.object({
      text: z.string().describe("Raw text to embed and store in Pinecone"),
      userId: z.string().describe("User ID to scope memory"),
      projectId: z.string().describe("Project ID to scope memory"),

    }),
  }
);

// ---------------------------------------------------------------------
// 2️⃣ RETRIEVE VECTOR MEMORY
// ---------------------------------------------------------------------

export const retrieveVectorMemoryTool = tool(
  async ({ query, userId,projectId, topK }) => {
    const { vectorStore } = await createVectorStore();

    const filter = { userId,projectId };

    const results = await vectorStore.similaritySearch(query, topK, filter);

    const formatted = results
      .map(
        (doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
      )
      .join("\n\n");

    return formatted || "No relevant memories found.";
  },
  {
    name: "retrieve_vector_memory",
    description: "Retrieve long-term memory related to the query.",
    schema: z.object({
      query: z.string(),
      userId: z.string(),
       projectId: z.string(),
      topK: z.number().default(5),
    }),
  }
);

