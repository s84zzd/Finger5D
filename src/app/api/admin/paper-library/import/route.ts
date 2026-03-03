import { NextRequest, NextResponse } from "next/server";
import { importPaperLibraryItemFromExternal } from "@/lib/admin-workflow";
import type { FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

/**
 * 单条导入入库：通过标题/DOI/来源 URL 拉取元数据，可选 PDF 直链直接全文落库。
 * 与外部检索入库并列，适用于已下载全文或从外部筛选后按 URL/DOI 导入。
 */
export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({})) as {
        title?: string;
        doi?: string;
        sourceUrl?: string;
        pdfUrl?: string;
        category?: FiveDCategory;
        themeSeed?: string;
        keywords?: string[];
    };

    try {
        const result = await importPaperLibraryItemFromExternal({
            title: body.title,
            doi: body.doi,
            sourceUrl: body.sourceUrl,
            pdfUrl: body.pdfUrl,
            category: body.category,
            themeSeed: body.themeSeed,
            keywords: body.keywords
        });

        return NextResponse.json({
            ...result.state,
            reused: result.reused,
            importedId: result.importedId
        });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "外部导入失败" },
            { status: 400 }
        );
    }
}
