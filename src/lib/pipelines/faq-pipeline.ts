
import { collapseDocs, splitListOfDocs } from "@langchain/classic/chains/combine_documents/reduce";

import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";


export async function generateFaq<T extends Runnable>(llm: T, splitDocs: Document[]) {
  let tokenMax = 3000;

  function approximateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async function lengthFunction(documents: Document[]) {
    const tokenCounts = documents.map((doc) =>
      approximateTokens(doc.pageContent)
    );
    return tokenCounts.reduce((sum, count) => sum + count, 0);
  }

  // Root state
  const OverallState = Annotation.Root({
    contents: Annotation<string[]>,

    // Each node returns Q&A pairs from a chunk — reduce concatenates them
    faqChunks: Annotation<string[]>({
      reducer: (state, update) => state.concat(update),
    }),
    collapsedFaqs: Annotation<Document[]>,
    finalFaq: Annotation<string>(),
  });

  // State for a single chunk
  interface FaqChunkState {
    content: string;
  }

  // Map: Generate 3-5 Q&A pairs for a single chunk
  const generateFaqChunk = async (
    state: FaqChunkState
  ): Promise<{ faqChunks: string[] }> => {
    const mapPrompt = ChatPromptTemplate.fromMessages([
      [
        "user",
        `Read the following text and generate 3-5 frequently asked questions (FAQ) with concise answers.

Format each Q&A pair exactly as:
**Q:** <question>
**A:** <answer>

Text:
{context}`,
      ],
    ]);

    const prompt = await mapPrompt.invoke({ context: state.content });
    const response = await llm.invoke(prompt);

    return { faqChunks: [String(response.content)] };
  };

  // Map logic
  const mapFaqChunks = (state: typeof OverallState.State) => {
    return state.contents.map(
      (content) => new Send("generateFaqChunk", { content })
    );
  };

  // Collect all chunks into Documents
  const collectFaqChunks = async (state: typeof OverallState.State) => {
    return {
      collapsedFaqs: state.faqChunks.map(
        (chunk) => new Document({ pageContent: chunk })
      ),
    };
  };

  // Reduce function: deduplicate and format into a final FAQ list
  async function reduceFaqs(input: Document[]) {
    const reducePrompt = ChatPromptTemplate.fromMessages([
      [
        "user",
        `The following are FAQ sections generated from different parts of a document:
{docs}

Your task:
1. Merge all Q&A pairs into a single, clean FAQ list of 8-12 questions.
2. Remove duplicate or near-duplicate questions — keep the best-worded version.
3. Format every Q&A pair exactly as:
   **Q:** <question>
   **A:** <answer>
4. Order questions from most fundamental to most specific.
5. Output only the final FAQ list in Markdown — no preamble or explanation.`,
      ],
    ]);

    const prompt = await reducePrompt.invoke({ docs: input });
    const response = await llm.invoke(prompt);
    return String(response.content);
  }

  // Collapse node
  const collapseFaqs = async (state: typeof OverallState.State) => {
    const docBatches = splitListOfDocs(
      state.collapsedFaqs,
      lengthFunction,
      tokenMax
    );
    const results = [];
    for (const batch of docBatches) {
      results.push(await collapseDocs(batch, reduceFaqs));
    }
    return { collapsedFaqs: results };
  };

  // Conditional check
  async function shouldCollapse(state: typeof OverallState.State) {
    const numTokens = await lengthFunction(state.collapsedFaqs);
    if (numTokens > tokenMax) {
      return "collapseFaqs";
    } else {
      return "generateFinalFaq";
    }
  }

  // Final FAQ
  const generateFinalFaq = async (state: typeof OverallState.State) => {
    const finalFaq = await reduceFaqs(state.collapsedFaqs);
    return { finalFaq };
  };

  // Construct the LangGraph
  const graph = new StateGraph(OverallState)
    .addNode("generateFaqChunk", generateFaqChunk)
    .addNode("collectFaqChunks", collectFaqChunks)
    .addNode("collapseFaqs", collapseFaqs)
    .addNode("generateFinalFaq", generateFinalFaq)
    .addConditionalEdges("__start__", mapFaqChunks, ["generateFaqChunk"])
    .addEdge("generateFaqChunk", "collectFaqChunks")
    .addConditionalEdges("collectFaqChunks", shouldCollapse, [
      "collapseFaqs",
      "generateFinalFaq",
    ])
    .addConditionalEdges("collapseFaqs", shouldCollapse, [
      "collapseFaqs",
      "generateFinalFaq",
    ])
    .addEdge("generateFinalFaq", "__end__");

  const app = graph.compile();

  let finalFaq = null;

  for await (const step of await app.stream(
    { contents: splitDocs.map((doc) => doc.pageContent) },
    { recursionLimit: 50 }
  )) {
    console.log(Object.keys(step));
    if (step.hasOwnProperty("generateFinalFaq")) {
      finalFaq = step.generateFinalFaq;
    }
  }

  return finalFaq;
}
