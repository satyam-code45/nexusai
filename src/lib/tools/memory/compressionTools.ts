// src/tools/compressionTools.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const summarizationModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  apiKey: process.env.OPENAI_API_KEY,
});


/**
 * summarize_message(message)
 * Take a long message (or concatenated messages) and produce
 * a compact summary suitable for long-term memory.
 */
export const summarizeMessageTool = tool(
  async ({ message }) => {
    const res = await summarizationModel.invoke([
      new SystemMessage(
        "You are a summarization engine. " +
          "Summarize the following text for long-term memory. " +
          "Keep it concise (5–8 sentences max) but preserve key facts, decisions, and user preferences."
      ),
      new HumanMessage(message),
    ]);


    return res?.content;
  },
  {
    name: "summarize_message",
    description:
      "Summarize a long user message or a chunk of conversation into a compact form for long-term memory.",
    schema: z.object({
      message: z
        .string()
        .describe("Raw text or concatenated messages to be summarized."),
    }),
  }
);

/**
 * extract_key_concepts(message)
 * Extract key entities, topics, preferences, and decisions
 * as a JSON-like structure the agent can reason over.
 */
export const extractKeyConceptsTool = tool(
  async ({ message }) => {
    const res = await summarizationModel.invoke([
      new SystemMessage(
        "Extract key concepts, entities, preferences, and important facts. " +
          "Return them as a concise bullet list or JSON-style structure. " +
          "Focus on information that is useful for future responses."
      ),
      new HumanMessage(message),
    ]);

  
    return res?.content;
  },
  {
    name: "extract_key_concepts",
    description:
      "Extract key concepts, entities, and user preferences from a message.",
    schema: z.object({
      message: z
        .string()
        .describe("Raw text or concatenated messages to analyze."),
    }),
  }
);





