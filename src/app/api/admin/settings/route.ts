import { NextRequest, NextResponse } from "next/server";
import { readWorkflowState, updateSearchSettings } from "@/lib/admin-workflow";
import type { PaperSource } from "@/lib/admin-types";

export const runtime = "nodejs";

interface SettingsBody {
    sourceWhitelist?: PaperSource[];
    sinceYear?: number;
    maxResultsPerSource?: number;
    minRelevanceScore?: number;
    weeklyTaskTarget?: number;
}

export async function GET() {
    const state = readWorkflowState();
    return NextResponse.json(state.searchSettings);
}

export async function PATCH(request: NextRequest) {
    const body = await request.json() as SettingsBody;
    const state = updateSearchSettings(body);
    return NextResponse.json(state);
}
