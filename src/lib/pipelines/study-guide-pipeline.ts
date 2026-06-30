import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";

const MAX_CHARS = 48_000;

export async function generateStudyguide<T extends Runnable>(llm: T, splitDocs: Document[]) {
  const fullText = splitDocs.map((d) => d.pageContent).join("\n\n").slice(0, MAX_CHARS);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an expert educator creating study guides that help students deeply understand and retain material.",
    ],
    [
      "user",
      `Create a study guide from the following document.

Use this exact structure:

## Learning Objectives
List 3–5 specific things a student will understand after studying this.

## Key Terms & Definitions
Term: clear one-sentence definition. (Include all important vocabulary.)

## Core Concepts
For each major concept:
- Explain it clearly in 2–4 sentences
- Give a concrete example or analogy

## Practice Questions
Write 4–6 questions that test understanding (not just recall). Include answers below each question.

## Quick Reference
3–7 bullet points — the most important facts to remember.

Document:
{text}`,
    ],
  ]);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({ text: fullText });
  const finalStudyGuide = String((response as any).content ?? response);
  return { finalStudyGuide };
}
