import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { createAgent } from "langchain";
import { retrieverAgentModel } from "@/lib/llm/agentModels";
import { RETRIEVER_AGENT_PROMPT } from "../../prompts/retrieverPrompt";
import { retrieverTool } from "@/lib/tools/RetrieverTool";
import { toolMonitoringMiddleware } from "../../middleware/toolMonitoringMiddleWare";




const  agent= createAgent({
    model: retrieverAgentModel,
  systemPrompt: RETRIEVER_AGENT_PROMPT,
  tools: [retrieverTool],
  middleware: [toolMonitoringMiddleware],
});

export const retrieverAgent = tool(
  async ({ query, userId, projectId, docUrls }) => {
    const filterNote = docUrls?.length
        ? ` When calling the retriever tool, you MUST pass docUrls: ${JSON.stringify(docUrls)} to restrict results to those sources only.`
        : "";
    const result = await agent.invoke({
      messages: [{ role: "user", content: query
        + ` Use userId:${userId} and projectId:${projectId} to fetch data.`
        + filterNote }]
    });
    return result.messages.at(-1)?.text ?? "";
  },
 {
  name: "RetrieverAgent",
  description:
    "Retrieves relevant documents from the vector database for the user's query.",
  schema: z.object({
    query: z.string().describe("User question"),
    userId: z.string().describe("userId to fetch data in external system"),
    projectId: z.string().describe("projectId to fetch data in external system"),
    docUrls: z.array(z.string()).optional().describe("Optional: source file URLs to restrict retrieval to. Pass directly to the retriever tool."),
  }),
}


);
