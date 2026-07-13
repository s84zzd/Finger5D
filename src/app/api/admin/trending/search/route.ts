import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import { searchTrendingTopics } from "@/lib/trending-search";
import type { FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        const body = await request.json() as {
            topic?: string;
            timeRange?: "week" | "month" | "quarter" | "year";
            sourceType?: "all" | "academic" | "news" | "review";
            dimensions?: FiveDCategory[];
        };

        const topic = String(body.topic ?? "").trim();
        if (!topic) {
            return NextResponse.json({ message: "请输入搜索主题" }, { status: 400 });
        }

        const timeRange = body.timeRange ?? "month";
        const sourceType = body.sourceType ?? "all";
        const dimensions: FiveDCategory[] = Array.isArray(body.dimensions) && body.dimensions.length > 0
            ? body.dimensions as FiveDCategory[]
            : ["cognitive", "cardio", "physical", "nutrition", "social"];

        const result = await searchTrendingTopics({
            topic,
            timeRange,
            sourceType,
            dimensions
        });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "选题搜索失败" },
            { status: 500 }
        );
    }
}
