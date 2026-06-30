import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createAgent } from "langchain";
import { memoryAgentModel } from "@/lib/llm/agentModels";

import { RESEARCHER_AGENT_PROMPT } from "./prompts/researchAgentPrompt";
import { toolMonitoringMiddleware } from "./middleware/toolMonitoringMiddleWare";
import { readShortHistoryTool, writeShortHistoryTool } from "../tools/memory/shortTermMemory";
import { retrieveVectorMemoryTool, saveVectorMemoryTool } from "../tools/memory/vectorMemory";
import { extractKeyConceptsTool, summarizeMessageTool } from "../tools/memory/compressionTools";
import { compressSTMTool } from "../tools/memory/compressSTMTool";
import { retrieveRelevantLTMTool } from "../tools/memory/retrieveRelevantLTMTool";
import { memorySystemPrompt } from "../tools/memory/MemoryPrompt";
import { mainResearcherAgent } from "./managerAgent";



export function memoryAndConversationalAgent(props: { userId: string, projectId: string, hasDocuments?: boolean }) {
    const { userId, projectId, hasDocuments = true } = props
    const prompt = memorySystemPrompt({ userId, projectId, hasDocuments })

    const baseTools = [
        writeShortHistoryTool,
        readShortHistoryTool,
        saveVectorMemoryTool,
        retrieveVectorMemoryTool,
        summarizeMessageTool,
        extractKeyConceptsTool,
        compressSTMTool,
        retrieveRelevantLTMTool,
    ];

    const tools = hasDocuments
        ? [...baseTools, mainResearcherAgent({ userId, projectId })]
        : baseTools;

    const agent = createAgent({
        model: memoryAgentModel,
        systemPrompt: prompt,
        tools,
        middleware: [toolMonitoringMiddleware],
    });

    return agent
}