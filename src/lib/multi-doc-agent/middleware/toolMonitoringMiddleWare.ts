import { createMiddleware } from "langchain";
import { statusContext } from "../statusContext";

// User-facing status messages for known tool names.
// Tools not listed here are silently ignored (internal/noisy ones).
const TOOL_STATUS: Record<string, string> = {
  "MainResearcherAgent":    "Searching your documents...",
  "MultiQueryAgent":        "Expanding your query...",
  "RetrieverAgent":         "Retrieving relevant content...",
  "LibrarianAgent":         "Identifying relevant documents...",
  "retriever":              "Querying vector database...",
  "read_short_history":     "Checking conversation history...",
  "retrieve_vector_memory": "Recalling relevant context...",
  "retrieve_relevant_ltm":  "Recalling long-term context...",
};

export const toolMonitoringMiddleware = createMiddleware({
  name: "ToolMonitoringMiddleware",
  wrapToolCall: (request, handler) => {
    const toolName = request.toolCall.name;
    console.log(`Executing tool: ${toolName}`);
    console.log(`Arguments: ${JSON.stringify(request.toolCall.args)}`);

    const statusMessage = TOOL_STATUS[toolName];
    if (statusMessage) {
      statusContext.getStore()?.(statusMessage);
    }

    try {
      const result = handler(request);
      console.log("Tool completed successfully=================================");
      return result;
    } catch (e) {
      console.log(`Tool failed: ${e}`);
      throw e;
    }
  },
});
