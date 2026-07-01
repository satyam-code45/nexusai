import { generateAIRewrite } from "@/lib/helper/aiRewrite";
import { generateAutocomplete } from "@/lib/helper/generateAutocomplete";
import { utilityModel } from "@/lib/llm/agentModels";
import { withAuth } from "@/lib/mongodb/withAuth";

import { NextResponse } from "next/server";



export const POST = withAuth(async (req: Request) => {
    const { action, selectedText } = await req.json();

    if (!selectedText) {
        return NextResponse.json(
            { message: "Missing selectedText" },
            { status: 400 }
        );
    }
    const llm = utilityModel

    const res = await generateAIRewrite(llm,action,selectedText)

    return NextResponse.json({ res });
});
