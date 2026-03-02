import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { appendTaskOperationLog, generateDraftForTask, getTaskById, updateTask } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const actor = getAuthenticatedUsernameFromCookieHeader(request.headers.get("cookie") ?? "") ?? "未知用户";

    try {
        const task = getTaskById(id);
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        const draft = await generateDraftForTask(task);

        const state = updateTask(id, (current) => ({
            ...appendTaskOperationLog(current, {
                action: "generate_draft",
                actor,
                detail: `生成草稿：${draft.title}`
            }),
            draftTitle: draft.title,
            draftSummary: draft.summary,
            draftContent: draft.content,
            status: "drafted"
        }));

        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to generate draft" },
            { status: 400 }
        );
    }
}
