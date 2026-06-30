import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb/mongodb";
import { Scratchpad } from "@/models/ScratchpadSchema";

export const writeFileTool = tool(
  async ({ content, fileName }) => {
    try {
      await connectDB();
      const fileId = `${fileName ?? "agent-file"}-${randomUUID().slice(0, 8)}-${Date.now()}`;
      const realFileName = `${fileId}.md`;

      await Scratchpad.create({ fileName: realFileName, content });

      return `<file_creation_result>
        <success>true</success>
        <message>file created successfully</message>
        <createdFileName>${realFileName}</createdFileName>
        </file_creation_result>`;
    } catch (error) {
      console.error("[writeFileTool] error:", error);
      return `<file_creation_result>
                <success>false</success>
                <error>Failed to create markdown file</error>
                </file_creation_result>`;
    }
  },
  {
    name: "offload_to_scratchpad",
    description: `
        <tool_description>
        Writes large amounts of content to a file for later retrieval by other agents.
        Returns a structured XML response indicating success/failure and the file name.
        </tool_description>
        `,
    schema: z.object({
      content: z.string().describe("Text or markdown content to write"),
      fileName: z.string().optional().describe("Optional filename prefix"),
    }),
  }
);

export const readFileTool = tool(
  async ({ fileName }) => {
    try {
      await connectDB();
      const doc = await Scratchpad.findOne({ fileName }).lean();

      if (!doc) {
        return `<file_read_result>
            <success>false</success>
            <message>file not found</message>
            </file_read_result>`;
      }

      return `<file_read_result>
            <success>true</success>
            <fileName>${fileName}</fileName>
            <content><![CDATA[${(doc as any).content}]]></content>
            </file_read_result>`;
    } catch (error) {
      console.error("❌ Scratchpad read error:", error);
      return `<file_read_result>
            <success>false</success>
            <message>failed to read file</message>
            </file_read_result>`;
    }
  },
  {
    name: "read_from_scratchpad",
    description: `
        <tool_description>
        Reads content previously saved by offload_to_scratchpad.
        Returns structured XML indicating success, the file name, and the content.
        Content is wrapped in CDATA to avoid breaking XML parsing.
        </tool_description>
        `,
    schema: z.object({
      fileName: z.string().describe("Markdown filename to read"),
    }),
  }
);
