import { NextRequest, NextResponse } from "next/server";
import { updatePaperLibraryFullTextAvailable } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { fullTextAvailable?: boolean };
    const fullTextAvailable = body.fullTextAvailable ?? true;

    try {
        const state = updatePaperLibraryFullTextAvailable(id, fullTextAvailable);
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "更新全文可用标记失败" },
            { status: 400 }
        );
    }
}
