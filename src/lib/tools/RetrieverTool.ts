
import { tool } from "@langchain/core/tools";
import z from "zod";
import { queryMultiVector } from "../pipelines/multi-vector";
import { connectDB } from "@/lib/mongodb/mongodb";
import { KnowledgeBase } from "@/models/KnowledgeBase";

export const retrieverTool = tool(
  async ({ query, projectId, userId, docUrl, docUrls }) => {
    const { retrievedDocs } = await queryMultiVector({ userId, projectId, query, docUrl, docUrls }) as any;

    // Build a URL→title map for citation support
    let urlToTitle: Record<string, string> = {};
    try {
      const urls = [...new Set(
        retrievedDocs
          .map((d: any) => d.metadata?.originalUrl)
          .filter(Boolean) as string[]
      )];
      if (urls.length > 0) {
        await connectDB();
        const kbDocs = await KnowledgeBase.find(
          { fileUrl: { $in: urls }, projectId },
          { fileUrl: 1, title: 1, fileName: 1 }
        ).lean();
        kbDocs.forEach((d: any) => {
          if (d.fileUrl) urlToTitle[d.fileUrl] = d.title || d.fileName || 'Source';
        });
      }
    } catch {
      // Non-fatal — citations just won't have titles
    }

    const serialized = retrievedDocs
      .map((doc: any) => {
        const url = doc.metadata?.originalUrl;
        const title = (url && urlToTitle[url]) ? urlToTitle[url] : (url?.split('/').pop() ?? 'Source');
        return `<doc>\n<source>${title}</source>\n<content>${doc.pageContent}</content>\n</doc>`;
      })
      .join("\n");

    return `<retrieved_docs_from_vector_db>\n${serialized}\n</retrieved_docs_from_vector_db>`;
  },
  {
    name: "retriever",
    description: `
<tool_description>
This tool retrieves relevant documents from the vector database based on a user query.
It returns structured data including the source title and content of each document.
The output is wrapped in <retrieved_docs_from_vector_db> tags, with individual <doc> elements
containing <source> (document title) and <content> tags.
Pass docUrl to scope retrieval to a specific document when the user @mentions a source.
</tool_description>
`,
    schema: z.object({
      query: z.string().describe("The search query for fetching related documents."),
      projectId: z.string().describe("The project ID used to scope the search to a specific user/project."),
      userId: z.string().describe("The user ID for which the documents are retrieved."),
      docUrl: z.string().optional().describe("Optional: file URL of a specific document to scope retrieval to. Use when the user has @mentioned a specific source by name."),
      docUrls: z.array(z.string()).optional().describe("Optional: list of file URLs to restrict retrieval to. Pass these when a system note instructs you to limit context to selected sources."),
    }),
  }
);
