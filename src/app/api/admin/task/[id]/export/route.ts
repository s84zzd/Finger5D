import { NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, getAuthenticatedUsernameFromCookie } from "@/lib/admin-auth";
import { appendTaskOperationLog, exportTaskDraft, getTaskById, updateTask } from "@/lib/admin-workflow";

export const runtime = "nodejs";

function getCookieValue(cookieHeader: string, cookieName: string): string {
    const parts = cookieHeader.split(";").map((item) => item.trim());
    const pair = parts.find((item) => item.startsWith(`${cookieName}=`));
    if (!pair) {
        return "";
    }
    return pair.slice(cookieName.length + 1);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const authCookie = getCookieValue(cookieHeader, ADMIN_AUTH_COOKIE);
    const actor = getAuthenticatedUsernameFromCookie(authCookie) ?? "未知用户";

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
