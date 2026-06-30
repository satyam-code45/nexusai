

import { collapseDocs, splitListOfDocs } from "@langchain/classic/chains/combine_documents/reduce";

import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";


export async function generateDocEntities<T extends Runnable>(llm: T, splitDocs: Document[]) {
  let tokenMax = 3000;

  // Approximate token counter
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

    // Each node returns chunks of study guide
    docEntities: Annotation<string[]>({
      reducer: (state, update) => state.concat(update),
    }),
    collapseddocEntities: Annotation<Document[]>,
    finalDocEnties: Annotation<string>(),
  });

  // State for a single chunk
  interface docEntitiestate {
    content: string;
  }

  // Map: Generate study guide for a single chunk
  const generateDocEntityChunk = async (
    state: docEntitiestate
  ): Promise<{ docEntities: string[] }> => {
    const mapPrompt = ChatPromptTemplate.fromMessages([
      [
        "user",
        `
        You are an information extraction engine.

        Extract key entities and relationships from the text.
       
        Rules:
        - Use concise entity names.
        - Relations should be uppercase verbs (USES, IMPROVES, GUIDES, etc).
        - Do NOT explain.
        - Do NOT add entities not present in the text.

        Output format:
        
        <doc_entity_output>
        eg: EntityA->USES->EntityB etc..
        </doc_entity_output>

        here is the context :\n\n{context}

`,
      ],
    ]);

    const prompt = await mapPrompt.invoke({ context: state.content });
    const response = await llm.invoke(prompt);

    return { docEntities: [String(response.content)] };
  };

  // Map logic
  const mapdocEntities = (state: typeof OverallState.State) => {
    return state.contents.map(
      (content) => new Send("generateDocEntityChunk", { content })
    );
  };

  // Collect all chunks into Documents
  const collectdocEntities = async (state: typeof OverallState.State) => {
    return {
      collapseddocEntities: state.docEntities.map(
        (guide) => new Document({ pageContent: guide })
      ),
    };
  };

  // Reduce function: distill multiple chunks into one
  async function reducedocEntities(input: Document[]) {
    const reducePrompt = ChatPromptTemplate.fromMessages([
      [
        "user",
        `You are a graph consolidation engine.

        Given the following graph chunks:
        {docs}
        - Merge duplicate entities
        - Remove duplicate relationships
        - Preserve only factual relationships
        - Output a single consolidated  graph.

`,
      ],
    ]);

    const prompt = await reducePrompt.invoke({ docs: input });
    const response = await llm.invoke(prompt);
    return String(response.content);
  }

  // Collapse node
  const collapsedocEntities = async (state: typeof OverallState.State) => {
    const docBatches = splitListOfDocs(
      state.collapseddocEntities,
      lengthFunction,
      tokenMax
    );
    const results = [];
    for (const batch of docBatches) {
      results.push(await collapseDocs(batch, reducedocEntities));
    }
    return { collapseddocEntities: results };
  };

  // Conditional check: should we collapse or generate final study guide
  async function shouldCollapse(state: typeof OverallState.State) {
    const numTokens = await lengthFunction(state.collapseddocEntities);
    if (numTokens > tokenMax) {
      return "collapsedocEntities";
    } else {
      return "generatefinalDocEnties";
    }
  }

  // Final study guide
  const generatefinalDocEnties = async (state: typeof OverallState.State) => {
    const finalGuide = await reducedocEntities(state.collapseddocEntities);
    return { finalDocEnties: finalGuide };
  };

  // Construct the LangGraph
  const graph = new StateGraph(OverallState)
    .addNode("generateDocEntityChunk", generateDocEntityChunk)
    .addNode("collectdocEntities", collectdocEntities)
    .addNode("collapsedocEntities", collapsedocEntities)
    .addNode("generatefinalDocEnties", generatefinalDocEnties)
    .addConditionalEdges("__start__", mapdocEntities, ["generateDocEntityChunk"])
    .addEdge("generateDocEntityChunk", "collectdocEntities")
    .addConditionalEdges("collectdocEntities", shouldCollapse, [
      "collapsedocEntities",
      "generatefinalDocEnties",
    ])
    .addConditionalEdges("collapsedocEntities", shouldCollapse, [
      "collapsedocEntities",
      "generatefinalDocEnties",
    ])
    .addEdge("generatefinalDocEnties", "__end__");

  const app = graph.compile();

  // Run the graph
  let finalDocEnties = null;

  for await (const step of await app.stream(
    { contents: splitDocs.map((doc) => doc.pageContent) },
    { recursionLimit: 50 }
  )) {
    console.log(Object.keys(step));
    if (step.hasOwnProperty("generatefinalDocEnties")) {
      finalDocEnties = step.generatefinalDocEnties;
    }
  }

  // console.log("Final Study Guide:\n", finalDocEnties);
  return finalDocEnties
}