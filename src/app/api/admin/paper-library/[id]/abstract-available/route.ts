import { NextRequest, NextResponse } from "next/server";
import { updatePaperLibraryAbstractAvailable } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { abstractAvailable?: boolean };
    const abstractAvailable = body.abstractAvailable ?? true;

    try {
        const state = updatePaperLibraryAbstractAvailable(id, abstractAvailable);
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "更新摘要可用标记失败" },
            { status: 400 }
        );
    }
}
