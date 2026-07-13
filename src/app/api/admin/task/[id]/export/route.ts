import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { appendTaskOperationLog, exportTaskDraft, getTaskById, updateTask } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const actor = getAuthenticatedUsernameFromCookieHeader(request.headers.get("cookie") ?? "") ?? "未知用户";

    try {
        const task = getTaskById(id);
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        if (task.status !== "approved" && task.status !== "published") {
            return NextResponse.json({ message: "仅支持导出已审核通过或已发布任务的草稿。" }, { status: 400 });
        }

        const filename = exportTaskDraft(task);
        const state = updateTask(id, (current) => ({
            ...appendTaskOperationLog(current, {
                action: "export",
                actor,
                detail: `导出草稿：${filename}`
            }),
            reviewComment: current.reviewComment
                ? `${current.reviewComment}\n已导出草稿：${filename}`
                : `已导出草稿：${filename}`
        }));

        return NextResponse.json({ ...state, exportedFile: filename });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to export draft" },
            { status: 400 }
        );
    }
}
