import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { createAgent } from "langchain";
import { writeFileTool } from "@/lib/tools/fileSystemTools";
import { plannerAgentModel } from "@/lib/llm/agentModels";
import { PLANNER_AGENT_PROMPT } from "../../prompts/plannerAgentPrompt";




const agent = createAgent({
  model: plannerAgentModel,
  systemPrompt: PLANNER_AGENT_PROMPT,
  tools: [writeFileTool]
});

export const plannerAgent = tool(
  async ({ query }) => {

    const result = await agent.invoke({
      messages: [{ role: "user", content: query }]
    });
    return result.messages.at(-1)?.text ?? "";
  },
  {
    name: "plannerAgent",
    description:
      "Analyzes the user's question and produces a step-by-step plan for how the system should retrieve.",
    schema: z.object({
      query: z.string().describe("User question"),
    }),
  }


);
