import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

async function encodeImageFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch image from URL");
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export const readImageTool = tool(
  async ({ imageUrl, prompt }) => {
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

      if (!imageUrl.startsWith("http")) {
        return JSON.stringify({ success: false, message: "Only Cloudinary/HTTP URLs are supported" });
      }

      const base64Image = await encodeImageFromUrl(imageUrl);

      const model = new ChatOpenAI({
        model: "gpt-4o",
        temperature: 0.7,
        apiKey: process.env.OPENAI_API_KEY,
      });

      const message = new HumanMessage({
        content: [
          {
            type: "text",
            text: prompt ?? "Summarize the key elements in this image clearly and concisely.",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64Image}` },
          },
        ],
      });

      const response = await model.invoke([message]);

      return JSON.stringify({ success: true, summary: response.content, viewImageUrl: imageUrl });
    } catch (error) {
      console.error("❌ Image read error:", error);
      return JSON.stringify({ success: false, message: (error as Error).message });
    }
  },
  {
    name: "read_image",
    description: "Read and analyze an image from a Cloudinary URL and return a text summary.",
    schema: z.object({
      imageUrl: z.string().describe("Cloudinary image URL"),
      prompt: z.string().describe("Optional custom instruction for image analysis"),
    }),
  }
);
