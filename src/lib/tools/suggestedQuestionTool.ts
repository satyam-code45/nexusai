import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb/mongodb";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";
import { SuggestedQuestions } from "@/models/SuggestedQuestionsSchema";
import { SystemMessage } from "langchain";

export const getSuggestedQuestionsTool = tool(
  async ({ userId, projectId, llm }) => {
    try {
      await connectDB();

      // 2. Fetch documents first (needed for cache invalidation check)
      const projectService = KnowLedgeBaseService.getInstance();
      const docs = await projectService.getDocsForProject({ userId, projectId });

      // 1. Check cache — invalidate when doc count changes
      const docCount = docs?.length ?? 0;
      const cached = await SuggestedQuestions.findOne({ userId, projectId }).lean();
      if (cached && (cached as any).docCount === docCount) return (cached as any).questions;

      if (!docs || docs.length === 0) return [];

      // 3. Generate via LLM
      const docList = `<document_list>${JSON.stringify(docs)}</document_list>`;
      const questions = await generateSuggestedQuestions(llm, docList);
      const finalQuestions = questions?.slice(0, 6) ?? [];

      // 4. Cache result (upsert) — store docCount so we can invalidate when new docs are added
      await SuggestedQuestions.updateOne(
        { userId, projectId },
        { $set: { questions: finalQuestions, docCount } },
        { upsert: true }
      );

      return finalQuestions;
    } catch (error) {
      console.error("❌ getSuggestedQuestionsTool error:", error);
      return [];
    }
  },
  {
    name: "getSuggestedQuestions",
    description: "Get suggested questions for the user based on their documents",
    schema: z.object({
      userId: z.string().describe("User ID"),
      projectId: z.string().describe("Project ID"),
      llm: z.any(),
    }),
  }
);

export async function generateSuggestedQuestions(llm: any, docList: string) {
  const jsonOutput = z.object({
    suggestedQuestions: z
      .array(z.string())
      .length(6)
      .describe("Six short suggested questions"),
  });

  const structuredLlm = (llm as any).withStructuredOutput(jsonOutput);

  const result = await structuredLlm.invoke([
    new SystemMessage(`
You are generating suggested questions for a chat interface similar to NotebookLM.

GOAL:
Generate exactly 6 useful questions that help a user explore and understand the provided documents.

STRICT RULES:
- Each question MUST be directly answerable from the documents.
- Do NOT invent topics not present in the documents.
- Each question must be between 20 and 30 characters long.
- Questions should be clear, concrete, and information-seeking.
- Avoid generic phrasing like "Explain", "Summarize", or "Tell me about".
- Prefer questions that reference concepts, processes, comparisons, or outcomes found in the documents.
- Output ONLY valid JSON matching the schema.
- Do NOT include markdown, explanations, or extra text.

STYLE:
- Neutral, concise, professional
- NotebookLM-style exploratory questions
- Suitable for autofill in a chat input

INPUT DOCUMENTS:
${docList}
`),
  ]);

  return result?.suggestedQuestions ?? [];
}
