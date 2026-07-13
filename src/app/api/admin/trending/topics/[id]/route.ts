import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { readWorkflowState, writeWorkflowState } from "@/lib/admin-workflow";
import { ignoreTrendingTopic } from "@/lib/trending-search";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        let state = readWorkflowState();
        state = ignoreTrendingTopic(state, id);
        writeWorkflowState(state);

        return NextResponse.json({ topics: state.trendingTopics ?? [] });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "操作失败" },
            { status: 500 }
        );
    }
}
