import { ChatOpenAI } from "@langchain/openai";

type LLMType = "openai";

export class LLM {
  private static instances: Partial<Record<LLMType, any>> = {};

  private constructor() {}

  public static getInstance(type: LLMType = "openai") {
    if (!LLM.instances[type]) {
      switch (type) {
        case "openai":
          if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
          LLM.instances[type] = new ChatOpenAI({
            model: "gpt-4o",
            temperature: 0.7,
            apiKey: process.env.OPENAI_API_KEY,
          });
          break;

        default:
          throw new Error(`Unsupported LLM type: ${type}`);
      }
    }

    return LLM.instances[type];
  }
}

export const openaiModel: ReturnType<typeof LLM.getInstance> = (() => {
  try { return LLM.getInstance("openai"); } catch { return null as any; }
})();
