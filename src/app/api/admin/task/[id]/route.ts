import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { appendTaskOperationLog, updateTask } from "@/lib/admin-workflow";
import type { PaperCandidate } from "@/lib/admin-types";

export const runtime = "nodejs";

interface PatchBody {
    theme?: string;
    topicNote?: string;
    selectedPaperId?: string;
    paperCandidates?: PaperCandidate[];
    status?: "planned" | "paper_selected" | "drafted" | "approved" | "rejected" | "published";
    reviewComment?: string;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json() as PatchBody;
    const actor = getAuthenticatedUsernameFromCookieHeader(request.headers.get("cookie") ?? "") ?? "未知用户";

    try {
        const state = updateTask(id, (task) => ({
            ...(body.status === "approved"
                ? appendTaskOperationLog(task, {
                    action: "approve",
                    actor,
                    detail: "审核通过"
                })
                : body.status === "rejected"
                    ? appendTaskOperationLog(task, {
                        action: "reject",
                        actor,
                        detail: "审核驳回"
                    })
                    : task),
            theme: body.theme ?? task.theme,
            topicNote: body.topicNote ?? task.topicNote,
            paperCandidates: Array.isArray(body.paperCandidates) ? body.paperCandidates : task.paperCandidates,
            selectedPaperId: body.selectedPaperId ?? task.selectedPaperId,
            reviewComment: body.reviewComment ?? task.reviewComment,
            status: body.status ?? task.status
        }));

        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to update task" },
            { status: 404 }
        );
    }
}
