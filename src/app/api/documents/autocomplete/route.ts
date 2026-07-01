import { generateAutocomplete } from "@/lib/helper/generateAutocomplete";
import { utilityModel } from "@/lib/llm/agentModels";
import { withAuth } from "@/lib/mongodb/withAuth";

import { NextResponse } from "next/server";



export const POST = withAuth(async (req: Request) => {
    const { previousWords, nextWords } = await req.json();

    if (!previousWords && !nextWords) {
        return NextResponse.json(
            { message: "Missing previousWords or nextWords" },
            { status: 400 }
        );
    }
    const llm = utilityModel

    const res = await generateAutocomplete(llm, previousWords)

    return NextResponse.json({ res });
});
