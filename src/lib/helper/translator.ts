import { SystemMessage } from "@langchain/core/messages";
import z from "zod";

export async function generateTranslate(
    llm: any,
    language: string,
    wordToTranslate: string
) {


    const jsonOutput = z.object({
        translated: z.string()
    }).describe('translated text');

    const structuredLlm = (llm as any).withStructuredOutput(jsonOutput);


    const systemPrompt = new SystemMessage(`
        You are a professional translation engine.

        Task:
        Translate the provided text into **${language}**.

        Rules:
        - Translate ONLY the given text.
        - Do NOT add explanations, notes, or alternatives.
        - Preserve the original meaning exactly.
        - Preserve tone, casing, punctuation, and formatting where applicable.
        - If the input is a single word, return a single translated word.
        - If the text is already in ${language}, return it unchanged.
        - Do NOT wrap the translation in quotes.
        - Output must strictly match the provided JSON schema.

        Input:
        <text>
        ${wordToTranslate}
        </text>
`)

    // Step 3: Call LLM
    const result = await structuredLlm.invoke([systemPrompt])

    // Step 4: Return the plain text suggestion
    const translated = result?.translated
    return translated
}