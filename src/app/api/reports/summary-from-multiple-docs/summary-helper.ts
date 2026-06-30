import {  ChatPromptTemplate } from '@langchain/core/prompts'



type SummaryItem = {
    title?: string | null;
    summary?: string | null;
};


export function formatSummaries(summaries: SummaryItem[]): string {
    return summaries
        .map(
            (item) =>
                `title:${item.title ?? ""},summary:${item.summary ?? ""}`
        )
        .join("--==|==--");
}

export async function mergeSummary(props: { llm: any, countSource: number, summaryToStr: string }) {

    const { llm, countSource, summaryToStr } = props

    const mapPrompt = ChatPromptTemplate.fromMessages([
        [
            "user",
            `You are a professional technical summarizer. Your task is to merge the following ${countSource} summaries into a single, polished, and concise summary.
                Each summary is separated by the marker: "--==|==--".

                Input summaries:
                {context}

                Output requirements:

                1. Structure:
                - Produce a clear, logically organized Markdown document.
                - Use headings (##) for major sections if applicable.
                - Use bullet points (-) for key concepts or takeaways.
                - Include sub-bullets when appropriate for details.

                2. Style & Clarity:
                - Preserve all essential ideas from the original summaries.
                - Avoid repetition, filler, or irrelevant content.
                - Keep the tone factual, neutral, and professional.
                - Highlight important terms, technologies, or concepts using **bold**.

                3. Readability:
                - Ensure the Markdown output is clean, scannable, and visually clear.
                - Paragraphs should be concise and coherent.
                - Lists should be indented and properly formatted.

                4. Output:
                - Only return Markdown content; do not include explanations outside of Markdown.
`
        ]
    ]);



    const chain = mapPrompt.pipe(llm);

    const result = await chain.invoke({
        context: summaryToStr
    }) as {content:string}

    const llmFinalSummary = result?.content;
    return llmFinalSummary



}
