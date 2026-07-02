import { tool } from "@langchain/core/tools";
import z from "zod";
import Exa from "exa-js";

export const webSearchTool = tool(
  async ({ query, numResults }) => {
    if (!process.env.EXA_API_KEY) throw new Error("Missing EXA_API_KEY");
    const exa = new Exa(process.env.EXA_API_KEY);

    const { results } = await exa.searchAndContents(query, {
      type: "auto",
      numResults: numResults ?? 5,
      text: true,
    });

    const serialized = results
      .map((r) => `<result>\n<title>${r.title ?? "Untitled"}</title>\n<url>${r.url}</url>\n<content>${r.text ?? ""}</content>\n</result>`)
      .join("\n");

    return `<web_search_results>\n${serialized}\n</web_search_results>`;
  },
  {
    name: "webSearch",
    description: `
<tool_description>
Searches the live web for up-to-date information via Exa.
Use this when the user's question needs current information (news, recent events, live data,
facts released after your training) or general knowledge not covered by the user's uploaded
documents. The output is wrapped in <web_search_results> tags, with individual <result> elements
containing <title>, <url>, and <content>. Cite the URL when you use a result in your answer.
</tool_description>
`,
    schema: z.object({
      query: z.string().describe("The search query to run against the web."),
      numResults: z.number().optional().describe("Number of results to return (default 5)."),
    }),
  }
);
