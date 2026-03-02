import { NextResponse } from "next/server";
import { applyCurrentWeekSlotToTasks } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const state = applyCurrentWeekSlotToTasks(id);
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to apply current week slot" },
            { status: 400 }
        );
    }
}
