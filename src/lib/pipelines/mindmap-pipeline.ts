import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import z from "zod";

const MindElixirNode: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    topic: z.string(),
    children: z.array(MindElixirNode).nullable(),
  })
);

const MindElixirData = z.object({
  nodeData: z.object({
    id: z.string(),
    topic: z.string(),
    children: z.array(MindElixirNode).nullable(),
  }),
});

const MAX_CHARS = 20_000;

export async function generateMindMap(llm: any, text: string) {
  const structuredLlm = llm.withStructuredOutput(MindElixirData);

  const prompt = PromptTemplate.fromTemplate(`
Create a mind map from the following document.

Rules:
- Root node = the main topic of the document (short title, 2–5 words)
- 4–7 main branches = major themes or sections
- Each branch has 2–5 child nodes = specific points, terms, or sub-ideas
- Each node topic must be SHORT: 1–5 words only
- Every node must have a unique ID (e.g. "root", "b1", "b2", "b1c1", "b1c2" ...)
- Do NOT include sentences or long text in any topic field

Document:
{text}
`);

  const chain = prompt.pipe(structuredLlm);
  const result = (await chain.invoke({ text: text.slice(0, MAX_CHARS) })) as Record<string, any>;
  return JSON.stringify(result, null, 2);
}
