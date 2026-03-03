import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { appendTaskOperationLog, generateCoreSummaryForTask, getTaskById, updateTask } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const actor = getAuthenticatedUsernameFromCookieHeader(request.headers.get("cookie") ?? "") ?? "未知用户";

    try {
        const task = getTaskById(id);
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        const coreSummary = await generateCoreSummaryForTask(task);

        const state = updateTask(id, (current) =>
            appendTaskOperationLog(
                { ...current, coreSummary },
                {
                    action: "generate_core_summary",
                    actor,
                    detail: "草稿预检：已生成核心内容摘要"
                }
            )
        );

        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "生成核心内容摘要失败" },
            { status: 400 }
        );
    }
}
