

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

import z from "zod";
import { Document } from "@langchain/core/documents";
import { Runnable } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "../utils";





export async function generateTitle<T extends Runnable>(llm: T, doc: Document<Record<string, any>>[]) {

    const docToString = formatDocumentsAsString(doc)


    const jsonOutput = z.object({
        title: z.string().max(80)
    }).describe('title for document');

    const structuredLlm = (llm as any).withStructuredOutput(jsonOutput);
    const result = await structuredLlm.invoke([

        new SystemMessage(`
            <identity>
            You are a title-generation assistant.
            </identity>

            <task>
            Generate exactly ONE title that captures the main theme of the document.
            </task>

            <constraints>
            - The title must be in English only — no other languages
            - Title length should be between 5 and 80 characters
            - The title must be concise and clear
            - Do not include explanations, subtitles, or formatting
            - Do not generate multiple options
            - Output plain text only
            </constraints>

            <input>
            ${docToString}
            </input>

            <output>
            Title:
            </output>
`)



    ]);
    const title = result?.title
    return title
}

