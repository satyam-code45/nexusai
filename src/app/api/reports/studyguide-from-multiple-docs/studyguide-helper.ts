import {  ChatPromptTemplate } from '@langchain/core/prompts'

type studyguideItem = {
    title?: string | null;
    studyguide?: string | null;
};


export function formatstudyguides(studyguides: studyguideItem[]): string {
    return studyguides
        .map(
            (item) =>
                `title:${item.title ?? ""},studyguide:${item.studyguide ?? ""}`
        )
        .join("--==|==--");
}

export async function mergestudyguide(props: { llm: any, countSource: number, studyguideToStr: string }) {

    const { llm, countSource, studyguideToStr } = props

    const mapPrompt = ChatPromptTemplate.fromMessages([
        [
            "user",
            `You are an expert educator. Merge the following ${countSource} study guides into one unified study guide.
Each study guide is separated by: "--==|==--".

Input:
{context}

Produce a single Markdown study guide with this structure:

## Learning Objectives
Combined objectives across all sources.

## Key Terms & Definitions
Merged vocabulary — remove duplicates.

## Core Concepts
Unified explanation of all major concepts with examples.

## Practice Questions
6–10 questions covering all sources, with answers.

## Quick Reference
The most important facts to remember across all documents.

Output only Markdown. No explanations outside the structure above.`
        ]
    ]);

    const prompt = await mapPrompt.invoke({ context: studyguideToStr });
    const response = await llm.invoke(prompt);
    const llmFinalstudyguide = response?.content;
    return llmFinalstudyguide

}
