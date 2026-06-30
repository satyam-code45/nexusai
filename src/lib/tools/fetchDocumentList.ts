import { SourceService } from "@/services/SourceService";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { connectDB } from "../mongodb/mongodb";
import { KnowLedgeBaseService } from "@/services/KnowLedgeBaseService";

export const fetchDocumentListTool = tool(
    async ({ userId, projectId }) => {
        try {
            if(!userId||!projectId){
                return "Ask the manager Agent to provide you the userId and projectId value. else we cannot proceed"
            }


            await connectDB();

            const projectService = KnowLedgeBaseService.getInstance();
            const docs = await projectService.getDocsForProject({ projectId, userId })



            return `<document_list>
                    ${JSON.stringify(docs)}
                    </document_list>`;

        } catch (error) {
            console.error("❌ fetchDocumentList error:", error);
            return `<document_list_result>
                    <success>false</success>
                    <message>Failed to fetch document list</message>
                    </document_list_result>`;
        }
    },
    {
        name: "fetchDocumentList",
        description: `
<tool_description>
Fetches the list of all document sources for a given user and project.
Returns a structured XML response containing <source> elements for each document.
Each <source> contains <id>, <name>, <type>, and <metadata> fields.
This format allows downstream agents to parse document lists reliably.
</tool_description>
`,
        schema: z.object({
            userId: z.string().describe("The user ID for whom the documents are retrieved."),
            projectId: z.string().describe("The project ID to scope the document list."),
        }),
    }
);
