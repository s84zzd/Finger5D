import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import {
    DRAFT_PROMPT_TEMPLATES,
    DRAFT_STUDY_TEMPLATES,
    type DraftPromptTemplate,
    type DraftStudyTemplate
} from "@/lib/admin-types";
import { appendTaskOperationLog, generateDraftForTask, getTaskById, updateTask } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const actor = getAuthenticatedUsernameFromCookieHeader(request.headers.get("cookie") ?? "") ?? "未知用户";
    const payload = await request.json().catch(() => ({})) as {
        promptTemplate?: DraftPromptTemplate;
        studyTemplate?: DraftStudyTemplate;
    };
    const promptTemplate = DRAFT_PROMPT_TEMPLATES.includes(payload.promptTemplate as DraftPromptTemplate)
        ? payload.promptTemplate as DraftPromptTemplate
        : "layered_progressive";
    const studyTemplate = DRAFT_STUDY_TEMPLATES.includes(payload.studyTemplate as DraftStudyTemplate)
        ? payload.studyTemplate as DraftStudyTemplate
        : "auto";

    try {
        const task = getTaskById(id);
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        const draft = await generateDraftForTask(task, { promptTemplate, studyTemplate });

        const state = updateTask(id, (current) => ({
            ...appendTaskOperationLog(current, {
                action: "generate_draft",
                actor,
                detail: `生成草稿（文风：${promptTemplate}，研究类型：${draft.requestedStudyTemplate ?? studyTemplate}${draft.resolvedStudyTemplate ? `→${draft.resolvedStudyTemplate}` : ""}${draft.studyDetectionRule ? `，识别依据：${draft.studyDetectionRule}` : ""}${(draft.studyDetectionEvidence?.length ?? 0) > 0 ? `，原句：${draft.studyDetectionEvidence?.slice(0, 5).join(" | ")}` : ""}）：${draft.title}`
            }),
            draftTitle: draft.title,
            draftSummary: draft.summary,
            draftContent: draft.content,
            draftPromptTemplate: promptTemplate,
            draftStudyTemplate: draft.resolvedStudyTemplate ?? studyTemplate,
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
