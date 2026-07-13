import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { readWorkflowState, writeWorkflowState } from "@/lib/admin-workflow";
import { saveTrendingTopic, ignoreTrendingTopic } from "@/lib/trending-search";
import type { TrendingTopic } from "@/lib/admin-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        const state = readWorkflowState();
        return NextResponse.json({ topics: state.trendingTopics ?? [] });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "获取选题库失败" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        const body = await request.json() as { topic?: TrendingTopic };
        if (!body.topic) {
            return NextResponse.json({ message: "缺少选题数据" }, { status: 400 });
        }

        let state = readWorkflowState();
        state = saveTrendingTopic(state, body.topic);
        writeWorkflowState(state);

        return NextResponse.json({ topics: state.trendingTopics ?? [] });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "收藏选题失败" },
            { status: 500 }
        );
    }
}
