import { NextResponse } from "next/server";
import { ensureWeeklyPlan } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function GET() {
    const state = ensureWeeklyPlan();
    return NextResponse.json(state);
}

export async function POST() {
    const state = ensureWeeklyPlan();
    return NextResponse.json(state);
}
