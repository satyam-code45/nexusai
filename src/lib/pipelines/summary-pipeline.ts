import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";

const MAX_CHARS = 48_000; // ~12k tokens — well within Cerebras 128k context

export async function generateSummary<T extends Runnable>(llm: T, splitDocs: Document[]) {
  const fullText = splitDocs.map((d) => d.pageContent).join("\n\n").slice(0, MAX_CHARS);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an expert document summarizer. Produce clear, structured Markdown summaries.",
    ],
    [
      "user",
      `Summarize the following document in Markdown.

Structure:
- A 2–3 sentence **Overview** at the top
- ## sections for each major topic
- Bullet points for key points under each section
- **Bold** important terms
- End with a ## Key Takeaways section (3–5 bullets)

Document:
{text}`,
    ],
  ]);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({ text: fullText });
  const finalSummary = String((response as any).content ?? response);
  return { finalSummary };
}
