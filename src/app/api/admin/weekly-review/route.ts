import { NextResponse } from "next/server";
import { createWeeklyReview, readWorkflowState } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function GET() {
    const state = readWorkflowState();
    return NextResponse.json(state.weeklyReviews);
}

export async function POST() {
    const state = createWeeklyReview();
    return NextResponse.json(state);
}
