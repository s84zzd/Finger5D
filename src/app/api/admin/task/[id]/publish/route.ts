import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { appendTaskOperationLog, getTaskById, publishTaskToArticle, updateTask } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const actor = getAuthenticatedUsernameFromCookieHeader(request.headers.get("cookie") ?? "") ?? "未知用户";

    try {
        const task = getTaskById(id);
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        const filename = publishTaskToArticle(task);
        const state = updateTask(id, (current) => ({
            ...appendTaskOperationLog(current, {
                action: "publish",
                actor,
                detail: `发布文章：${filename}`
            }),
            status: "published",
            reviewComment: current.reviewComment ? `${current.reviewComment}\n已发布：${filename}` : `已发布：${filename}`
        }));

        return NextResponse.json({ ...state, publishedFile: filename });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to publish article" },
            { status: 400 }
        );
    }
}
