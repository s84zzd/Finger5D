import { NextRequest, NextResponse } from "next/server";
import { updatePaperLibraryKeywords } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { keywords?: string[] };

    try {
        const keywords = Array.isArray(body.keywords) ? body.keywords : [];
        const state = updatePaperLibraryKeywords(id, keywords);
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "更新关键词失败" },
            { status: 400 }
        );
    }
}
