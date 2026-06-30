
import { collapseDocs, splitListOfDocs } from "@langchain/classic/chains/combine_documents/reduce";

import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";


export async function generateBriefing<T extends Runnable>(llm: T, splitDocs: Document[]) {
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

    // Each node returns extracted facts/decisions/actions from a chunk
    briefingChunks: Annotation<string[]>({
      reducer: (state, update) => state.concat(update),
    }),
    collapsedBriefings: Annotation<Document[]>,
    finalBriefing: Annotation<string>(),
  });

  // State for a single chunk
  interface BriefingChunkState {
    content: string;
  }

  // Map: Extract key facts, decisions, and action items from a single chunk
  const generateBriefingChunk = async (
    state: BriefingChunkState
  ): Promise<{ briefingChunks: string[] }> => {
    const mapPrompt = ChatPromptTemplate.fromMessages([
      [
        "user",
        `Extract the following from the text below. Be concise and factual.

- **Key Facts**: Important information, data points, or context
- **Decisions / Findings**: Conclusions reached or significant findings
- **Action Items**: Tasks, next steps, or recommendations mentioned

Text:
{context}`,
      ],
    ]);

    const prompt = await mapPrompt.invoke({ context: state.content });
    const response = await llm.invoke(prompt);

    return { briefingChunks: [String(response.content)] };
  };

  // Map logic
  const mapBriefingChunks = (state: typeof OverallState.State) => {
    return state.contents.map(
      (content) => new Send("generateBriefingChunk", { content })
    );
  };

  // Collect all chunks into Documents
  const collectBriefingChunks = async (state: typeof OverallState.State) => {
    return {
      collapsedBriefings: state.briefingChunks.map(
        (chunk) => new Document({ pageContent: chunk })
      ),
    };
  };

  // Reduce function: structure into an executive brief
  async function reduceBriefings(input: Document[]) {
    const reducePrompt = ChatPromptTemplate.fromMessages([
      [
        "user",
        `The following are extracted facts, decisions, and action items from sections of a document:
{docs}

Synthesize these into a polished executive briefing document with the following sections:

## Overview
A 2-3 sentence high-level summary of the document's subject and purpose.

## Key Points
A bullet list of the most important facts, data, and context.

## Decisions / Findings
A bullet list of conclusions reached, significant findings, or determinations made.

## Action Items
A bullet list of tasks, next steps, or recommendations. If none are present, write "No specific action items identified."

Rules:
- Use **bold** to highlight critical terms or values.
- Remove duplicate or redundant points across sections.
- Keep the tone professional, neutral, and concise.
- Output only Markdown — no preamble or explanation outside the document.`,
      ],
    ]);

    const prompt = await reducePrompt.invoke({ docs: input });
    const response = await llm.invoke(prompt);
    return String(response.content);
  }

  // Collapse node
  const collapseBriefings = async (state: typeof OverallState.State) => {
    const docBatches = splitListOfDocs(
      state.collapsedBriefings,
      lengthFunction,
      tokenMax
    );
    const results = [];
    for (const batch of docBatches) {
      results.push(await collapseDocs(batch, reduceBriefings));
    }
    return { collapsedBriefings: results };
  };

  // Conditional check
  async function shouldCollapse(state: typeof OverallState.State) {
    const numTokens = await lengthFunction(state.collapsedBriefings);
    if (numTokens > tokenMax) {
      return "collapseBriefings";
    } else {
      return "generateFinalBriefing";
    }
  }

  // Final briefing
  const generateFinalBriefing = async (state: typeof OverallState.State) => {
    const finalBriefing = await reduceBriefings(state.collapsedBriefings);
    return { finalBriefing };
  };

  // Construct the LangGraph
  const graph = new StateGraph(OverallState)
    .addNode("generateBriefingChunk", generateBriefingChunk)
    .addNode("collectBriefingChunks", collectBriefingChunks)
    .addNode("collapseBriefings", collapseBriefings)
    .addNode("generateFinalBriefing", generateFinalBriefing)
    .addConditionalEdges("__start__", mapBriefingChunks, ["generateBriefingChunk"])
    .addEdge("generateBriefingChunk", "collectBriefingChunks")
    .addConditionalEdges("collectBriefingChunks", shouldCollapse, [
      "collapseBriefings",
      "generateFinalBriefing",
    ])
    .addConditionalEdges("collapseBriefings", shouldCollapse, [
      "collapseBriefings",
      "generateFinalBriefing",
    ])
    .addEdge("generateFinalBriefing", "__end__");

  const app = graph.compile();

  let finalBriefing = null;

  for await (const step of await app.stream(
    { contents: splitDocs.map((doc) => doc.pageContent) },
    { recursionLimit: 50 }
  )) {
    console.log(Object.keys(step));
    if (step.hasOwnProperty("generateFinalBriefing")) {
      finalBriefing = step.generateFinalBriefing;
    }
  }

  return finalBriefing;
}
