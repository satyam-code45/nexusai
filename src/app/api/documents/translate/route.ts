import { generateAutocomplete } from "@/lib/helper/generateAutocomplete";
import { generateTranslate } from "@/lib/helper/translator";
import { utilityModel } from "@/lib/llm/agentModels";
import { withAuth } from "@/lib/mongodb/withAuth";

import { NextResponse } from "next/server";



export const POST = withAuth(async (req: Request) => {
    const {  language ,wordToTranslate} = await req.json();

    if (!language || !wordToTranslate) {
        return NextResponse.json(
            { message: "Missing wordToTranslate or language" },
            { status: 400 }
        );
    }
    const llm = utilityModel

    const res = await generateTranslate(llm,language, wordToTranslate)

    return NextResponse.json({ res });
});
