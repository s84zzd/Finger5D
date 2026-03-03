import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { appendTaskOperationLog, getPaperLibraryCandidates, readWorkflowState, updateTask } from "@/lib/admin-workflow";
import type { PaperCandidate, WorkflowState } from "@/lib/admin-types";

export const runtime = "nodejs";

function getPaperUniqueKey(paper: PaperCandidate): string {
    const doi = String(paper.doi ?? "").trim().toLowerCase();
    if (doi) {
        return `doi:${doi}`;
    }

    const url = String(paper.url ?? "").trim().toLowerCase();
    if (url) {
        return `url:${url}`;
    }

    return `title:${paper.title.trim().toLowerCase()}`;
}

function collectSelectedPaperKeys(state: WorkflowState, currentTaskId: string): Set<string> {
    const used = new Set<string>();

    for (const task of state.tasks) {
        if (task.id === currentTaskId) {
            continue;
        }

        if (!task.selectedPaperId) {
            continue;
        }

        const selected = task.paperCandidates.find((item) => item.id === task.selectedPaperId);
        if (!selected) {
            continue;
        }

        used.add(getPaperUniqueKey(selected));
    }

    return used;
}

function extractCitationAttribute(tag: string, attribute: "title" | "url" | "doi"): string {
    const regex = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i");
    const matched = tag.match(regex)?.[1] ?? "";
    return matched.trim();
}

function collectPublishedArticleKeys(): Set<string> {
    const used = new Set<string>();
    const articlesDir = path.join(process.cwd(), "src", "content", "articles");

    if (!fs.existsSync(articlesDir)) {
        return used;
    }

    const files = fs.readdirSync(articlesDir).filter((name) => name.endsWith(".mdx"));

    for (const file of files) {
        const filePath = path.join(articlesDir, file);
        const content = fs.readFileSync(filePath, "utf8");
        const citationTags = content.match(/<Citation\b[^>]*>/g) ?? [];

        for (const tag of citationTags) {
            const doi = extractCitationAttribute(tag, "doi").toLowerCase();
            const url = extractCitationAttribute(tag, "url").toLowerCase();
            const title = extractCitationAttribute(tag, "title").toLowerCase();

            if (doi) {
                used.add(`doi:${doi}`);
            }
            if (url) {
                used.add(`url:${url}`);
            }
            if (title) {
                used.add(`title:${title}`);
            }
        }
    }

    return used;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const actor = getAuthenticatedUsernameFromCookieHeader(request.headers.get("cookie") ?? "") ?? "未知用户";

    try {
        const stateBefore = readWorkflowState();
        const task = stateBefore.tasks.find((item) => item.id === id);
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        const libraryCandidates = getPaperLibraryCandidates(task.category, task.theme);
        const usedPaperKeys = collectSelectedPaperKeys(stateBefore, id);
        const publishedPaperKeys = collectPublishedArticleKeys();

        const combinedUsedKeys = new Set<string>([...usedPaperKeys, ...publishedPaperKeys]);
        const uniqueCandidates = libraryCandidates.filter((candidate) => !combinedUsedKeys.has(getPaperUniqueKey(candidate)));

        const state = updateTask(id, (task) => ({
            ...appendTaskOperationLog(task, {
                action: "search_papers",
                actor,
                detail: `从论文库选取：返回 ${uniqueCandidates.length} 条候选（库内匹配 ${libraryCandidates.length}，已过滤历史已用论文）`
            }),
            paperCandidates: uniqueCandidates,
            selectedPaperId: uniqueCandidates[0]?.id,
            status: uniqueCandidates.length > 0 ? "paper_selected" : task.status
        }));

        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to search papers" },
            { status: 400 }
        );
    }
}
