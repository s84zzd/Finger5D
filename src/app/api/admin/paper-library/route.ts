import { NextRequest, NextResponse } from "next/server";
import { getPaperLibrary, searchAndSavePaperLibrary } from "@/lib/admin-workflow";
import type { FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json(getPaperLibrary());
}

export async function POST(request: NextRequest) {
    const body = await request.json() as { theme?: string; category?: FiveDCategory | "other"; page?: number };

    try {
        const theme = String(body.theme ?? "").trim();
        const category = body.category;
        const page = Number(body.page ?? 1);

        if (!theme) {
            return NextResponse.json({ message: "主题不能为空" }, { status: 400 });
        }

        if (!category) {
            return NextResponse.json({ message: "分类不能为空" }, { status: 400 });
        }

        if (category !== "other" && !["cardio", "physical", "cognitive", "nutrition", "social"].includes(category)) {
            return NextResponse.json({ message: "分类不合法" }, { status: 400 });
        }

        const result = await searchAndSavePaperLibrary(theme, category, page);
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
