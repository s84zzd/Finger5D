import { NextRequest, NextResponse } from "next/server";
import { downloadPaperLibraryItem } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { mode?: "summary" | "original" };
    const mode = body.mode === "original" ? "original" : "summary";

    try {
        const result = await downloadPaperLibraryItem(id, mode);
        return NextResponse.json({ ...result.state, localFilePath: result.localFilePath });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : (mode === "original" ? "下载原文失败" : "下载摘要失败") },
            { status: 400 }
        );
    }
}
