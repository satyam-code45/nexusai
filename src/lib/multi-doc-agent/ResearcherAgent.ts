import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  // BaseMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { createAgent } from "langchain";
import { LibrarianAgent } from "./sub-agents/researchTeam/LibrarianAgent";
import { researcherAgentModel } from "@/lib/llm/agentModels";
import { multiQueryAgent } from "./sub-agents/researchTeam/multiQueryAgent";
import { plannerAgent } from "./sub-agents/researchTeam/plannerAgentResearch";
// import { RESEARCHER_AGENT_PROMT } from "./prompts/researchAgentPrompt";
import { writeFileTool, readFileTool } from "@/lib/tools/fileSystemTools";
import { RESEARCHER_AGENT_PROMPT } from "./prompts/researchAgentPrompt";
import { retrieverAgent } from "./sub-agents/researchTeam/RetrieverAgent";
import { toolMonitoringMiddleware } from "./middleware/toolMonitoringMiddleWare";
import { statusContext } from "./statusContext";



const agent = createAgent({
  model: researcherAgentModel,
  systemPrompt: RESEARCHER_AGENT_PROMPT,
  tools: [LibrarianAgent, multiQueryAgent, plannerAgent, readFileTool, writeFileTool, retrieverAgent],
  middleware: [toolMonitoringMiddleware],
});

export const researcherAgent = tool(
  async ({ query, userId, projectId, docUrls }) => {
    // Fast path: specific sources already selected — skip planner and librarian,
    // expand the query then retrieve directly. Saves 2-3 redundant LLM calls.
    // Middleware doesn't fire for direct .invoke() calls, so emit status manually.
    if (docUrls?.length) {
      statusContext.getStore()?.("Expanding your query...");
      const expandedQueries = await multiQueryAgent.invoke({ query }) as string;
      statusContext.getStore()?.("Searching selected sources...");
      const combined = `Original question: ${query}\n\nExpanded queries:\n${expandedQueries}`;
      const result = await retrieverAgent.invoke({ query: combined, userId, projectId, docUrls }) as string;
      return result;
    }

    // Full pipeline for open-ended research (no specific source selected).
    const result = await agent.invoke({
      messages: [{ role: "user", content:
        query + ` YOU MUST PROVIDE these params to sub-agents: userId:${userId} projectId:${projectId}.`
      }]
    });
    const last = result.messages.at(-1);
    return (typeof last?.content === "string" ? last.content : "") ?? "";
  },
  {
    name: "ResearcherAgent",
    description:
      "Analyzes the user's question and produces a step-by-step plan for how the system should retrieve.",
    schema: z.object({
      query: z.string().describe("User question"),
      userId: z.string().describe("userId to fetch data in external system"),
      projectId: z.string().describe("projectId to fetch data in external system"),
      docUrls: z.array(z.string()).optional().describe("Optional: source file URLs to restrict retrieval to. Pass to RetrieverAgent unchanged."),
    }),
  }
);