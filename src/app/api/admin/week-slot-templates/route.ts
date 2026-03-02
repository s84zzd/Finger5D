import { NextRequest, NextResponse } from "next/server";
import { readWorkflowState, saveWeekSlotTemplate } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function GET() {
    const state = readWorkflowState();
    return NextResponse.json(state.weekSlotTemplates);
}

export async function POST(request: NextRequest) {
    const body = await request.json() as { name?: string; weekSlots?: string[] };

    try {
        const state = saveWeekSlotTemplate(String(body.name ?? ""), Array.isArray(body.weekSlots) ? body.weekSlots : []);
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "保存模板失败" },
            { status: 400 }
        );
    }
}
