import { NextRequest, NextResponse } from "next/server";
import { readWorkflowState, updateCollaborationSettings } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function GET() {
    const state = readWorkflowState();
    return NextResponse.json(state.collaboration);
}

export async function PATCH(request: NextRequest) {
    const body = await request.json() as {
        planningReviewer?: string;
        paperRetriever?: string;
        draftReviewer?: string;
    };
    const state = updateCollaborationSettings(body);
    return NextResponse.json(state);
}
