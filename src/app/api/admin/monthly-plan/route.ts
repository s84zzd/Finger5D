import { NextResponse } from "next/server";
import { createMonthlyPlan, readWorkflowState } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function GET() {
    const state = readWorkflowState();
    return NextResponse.json(state.monthlyPlans);
}

export async function POST() {
    const state = createMonthlyPlan();
    return NextResponse.json(state);
}
