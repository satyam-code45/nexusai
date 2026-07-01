


import { SystemMessage } from "@langchain/core/messages";

import z from "zod";



export async function generateAutocomplete(
    llm: any,
    prevWords: string,
    // nextWords: string
) {

    
    const jsonOutput = z.object({
        suggestions: z.string().min(60).max(2000)
    }).describe('suggested text');

    const structuredLlm = (llm as any).withStructuredOutput(jsonOutput);

   
const systemPrompt = new SystemMessage(`
You are an autocomplete engine for a rich-text editor.

Your role is NOT to generate new ideas.
Your role is to CONTINUE WRITING from the last words exactly as a human typist would.

Rules you must follow strictly:
1. Use ONLY the text inside <previous_doc_word> as context.
2. Predict what comes NEXT, immediately after the last character.
3. Do NOT change topic, structure, or intent.
4. Do NOT summarize or restart.
5. Continue the same sentence or paragraph unless it is clearly finished.
6. You MAY return HTML, but ONLY these tags:
   - <p>
   - <ul>
   - <li>
   - <strong>
7. Do NOT use any other HTML tags.
8. Do NOT use Markdown.
9. Do NOT add attributes to any HTML tags.
10. The output must read as if it was written by the same author.
11. Minimum length: 100 words.
12. Return ONLY the continuation text. No explanations.

Context:
<previous_doc_word>
${prevWords}
</previous_doc_word>
`)

    // Step 3: Call LLM
    const result = await structuredLlm.invoke([systemPrompt])

    // Step 4: Return the plain text suggestion
     const suggestions = result?.suggestions
    return suggestions
}