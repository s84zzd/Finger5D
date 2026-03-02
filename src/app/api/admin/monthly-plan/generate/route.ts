import { NextResponse } from "next/server";
import { ensureMonthlyPlanTasks } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST() {
    const state = ensureMonthlyPlanTasks();
    return NextResponse.json(state);
}
