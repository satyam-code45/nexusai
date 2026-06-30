import { Runnable } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";

export interface ScriptTurn {
  speaker: "Alex" | "Sam";
  text: string;
}

export async function generatePodcastScript<T extends Runnable>(
  llm: T,
  summaries: Array<{ title?: string | null; summary?: string | null }>
): Promise<ScriptTurn[]> {
  const summaryText = summaries
    .map((s, i) => `[Document ${i + 1}${s.title ? ` — ${s.title}` : ""}]\n${s.summary || "No summary available."}`)
    .join("\n\n---\n\n");

  const prompt = `You are generating a lively, informative podcast episode between two hosts discussing research documents.

HOST PERSONAS:
- Alex: Curious, asks clarifying questions, relates concepts to everyday life. Warm and engaging.
- Sam: Knowledgeable, provides depth, gives concrete examples. Thoughtful and precise.

DOCUMENT SUMMARIES:
${summaryText}

TASK:
Create a natural 4-6 minute podcast conversation (around 600-800 words total) about the key ideas in these documents.
The hosts should make the content accessible, highlight the most interesting insights, and engage the listener.

RULES:
- Each turn should be 1-3 sentences, natural spoken language.
- Alternate between Alex and Sam throughout.
- Alex should start.
- Do NOT use bullet points or markdown — write natural speech.
- Return ONLY a valid JSON array with NO additional text, no markdown fences.
- Example format: [{"speaker":"Alex","text":"..."},{"speaker":"Sam","text":"..."}]`;

  const response = await llm.invoke([new HumanMessage(prompt)]);
  const raw = typeof response.content === "string"
    ? response.content
    : String(response.content);

  // Extract JSON array from the response (handles any stray markdown code fences)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("LLM did not return valid JSON script");

  const parsed = JSON.parse(jsonMatch[0]) as ScriptTurn[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Podcast script is empty");
  }
  return parsed;
}
