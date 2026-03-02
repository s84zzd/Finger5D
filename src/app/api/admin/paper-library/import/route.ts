import { NextRequest, NextResponse } from "next/server";
import { importPaperLibraryItemFromExternal } from "@/lib/admin-workflow";
import type { FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({})) as {
        title?: string;
        doi?: string;
        sourceUrl?: string;
        pdfUrl?: string;
        category?: FiveDCategory;
        themeSeed?: string;
    };

    try {
        const result = await importPaperLibraryItemFromExternal({
            title: body.title,
            doi: body.doi,
            sourceUrl: body.sourceUrl,
            pdfUrl: body.pdfUrl,
            category: body.category,
            themeSeed: body.themeSeed
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
