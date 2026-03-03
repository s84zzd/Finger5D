import { NextResponse } from "next/server";
import { generateCoreSummaryForLibraryItem } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const content = await generateCoreSummaryForLibraryItem(id);
        return NextResponse.json({ content });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "预检生成失败" },
            { status: 400 }
        );
    }
}
