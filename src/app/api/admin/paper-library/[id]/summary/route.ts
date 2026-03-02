import { NextResponse } from "next/server";
import { getPaperLibrarySummaryPreview } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const result = getPaperLibrarySummaryPreview(id);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "读取摘要失败" },
            { status: 400 }
        );
    }
}
