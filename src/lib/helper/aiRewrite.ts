


import { SystemMessage } from "@langchain/core/messages";

import z from "zod";




export async function generateAIRewrite(
  llm: any,
  action: 'fix_grammar' | 'improve_writing' | 'rephrase',
  selectedText: string
) {
  const jsonOutput = z.object({
    result: z.string()
  })

  const structuredLlm = llm.withStructuredOutput(jsonOutput)

  const systemPrompt = new SystemMessage(`
You are an AI writing assistant embedded inside a text editor.

Your task is to rewrite ONLY the user-selected text according to the requested action.

Action:
${action}

Definitions:
- fix_grammar: Correct grammatical, spelling, and punctuation errors ONLY.
- improve_writing: Improve clarity, flow, and writing quality while preserving meaning.
- rephrase: Rewrite the text using different wording while keeping the same meaning.

Rules:
- Operate ONLY on the provided text.
- Do NOT add or remove information.
- Do NOT explain changes.
- Preserve original language and intent.
- Preserve formatting where possible.
- If no change is needed, return the original text.
- Output must strictly follow the JSON schema.

Input:
<selected_text>
${selectedText}
</selected_text>
`)

  const result = await structuredLlm.invoke([systemPrompt])

  return result?.result
}