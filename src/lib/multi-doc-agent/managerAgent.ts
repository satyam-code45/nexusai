
import { researcherAgent } from "./ResearcherAgent";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export function mainResearcherAgent(props: { userId: string; projectId: string }) {
    const { userId, projectId } = props;

    // Call researcherAgent directly — no intermediate LLM routing needed.
    // The intermediate router always just delegated to researcherAgent anyway,
    // adding a full LLM call per user message for no benefit.
    return tool(
        async ({ query, docUrls }) => {
            const result = await researcherAgent.invoke({ query, userId, projectId, docUrls });
            return typeof result === "string" ? result : JSON.stringify(result);
        },
        {
            name: "MainResearcherAgent",
            description: `Research assistant that answers user questions by retrieving relevant information from the user's document library and vector database.`,
            schema: z.object({
                query: z.string().describe("User question"),
                docUrls: z.array(z.string()).optional().describe("Optional: source file URLs to restrict retrieval to."),
            }),
        }
    );
}