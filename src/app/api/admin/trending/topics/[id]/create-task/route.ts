import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { readWorkflowState, writeWorkflowState } from "@/lib/admin-workflow";
import { createTaskFromTopic } from "@/lib/trending-search";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        let state = readWorkflowState();
        const result = await createTaskFromTopic(state, id);
        state = result.state;
        writeWorkflowState(state);

        return NextResponse.json({
            topics: state.trendingTopics ?? [],
            taskId: result.taskId,
            importedCount: result.importedCount
        });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "创建任务失败" },
            { status: 500 }
        );
    }
}
