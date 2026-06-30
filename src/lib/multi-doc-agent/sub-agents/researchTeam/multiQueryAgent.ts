import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { createAgent } from "langchain";
import { multiQueryAgentModel } from "@/lib/llm/agentModels";
import { MULTI_QUERY_PROMPT } from "../../prompts/multiQueryAgentPrompt";




const  agent= createAgent({
    model: multiQueryAgentModel,
  systemPrompt: MULTI_QUERY_PROMPT,
  tools: [],
});

export const multiQueryAgent = tool(
  async ({ query }) => {

    const result = await agent.invoke({
      messages: [{ role: "user", content: query }]
    });
    return result.messages.at(-1)?.text ?? "";
  },
  {
  name: "MultiQueryAgent",
  description:
    "Generates multiple semantically diverse search queries from the user's question to improve document retrieval.",
  schema: z.object({
    query: z.string().describe("Original user question"),
  }),
}


);
