import { NextRequest, NextResponse } from "next/server";
import { getPaperLibrary, searchAndSavePaperLibrary } from "@/lib/admin-workflow";
import type { FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

/** 返回当前论文库列表（用于浏览与筛选） */
export async function GET() {
    return NextResponse.json(getPaperLibrary());
}

/**
 * 外部检索入库：从 PubMed 等外部论文库按自定义关键字检索，每批 20 篇写入论文库。
 * body.theme：检索用自定义关键字；body.category：入库分类；body.page：页码；body.keywords：入库打标关键字。
 */
export async function POST(request: NextRequest) {
    const body = await request.json() as {
        theme?: string;
        category?: FiveDCategory | "other";
        page?: number;
        keywords?: string[];
    };

    try {
        const theme = String(body.theme ?? "").trim();
        const category = body.category;
        const page = Number(body.page ?? 1);
        const keywords = Array.isArray(body.keywords)
            ? body.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 20)
            : undefined;

        if (!theme) {
            return NextResponse.json({ message: "主题不能为空" }, { status: 400 });
        }

        if (!category) {
            return NextResponse.json({ message: "分类不能为空" }, { status: 400 });
        }

        if (category !== "other" && !["cardio", "physical", "cognitive", "nutrition", "social"].includes(category)) {
            return NextResponse.json({ message: "分类不合法" }, { status: 400 });
        }

        const result = await searchAndSavePaperLibrary(theme, category, page, keywords);
        return NextResponse.json({
            ...result.state,
            addedCount: result.addedCount,
            matchedCount: result.matchedCount,
            reusedCount: result.reusedCount,
            requestedPage: result.requestedPage
        });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "论文入库失败" },
            { status: 400 }
        );
    }
}
