import { NextRequest, NextResponse } from "next/server";
import {
    deletePaperLibraryItem,
    updatePaperLibraryKeywords,
    updatePaperLibraryMeta,
    updatePaperLibraryRecord
} from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as {
        keywords?: string[];
        adopted?: boolean;
        storageCategory?: string;
        title?: string;
        titleZh?: string;
        authors?: string;
        journal?: string;
        year?: string;
        doi?: string;
        url?: string;
        abstractEn?: string;
        abstractZh?: string;
        customCategories?: string[];
        referenceTypeCode?: string;
        volume?: string;
        issue?: string;
        pages?: string;
    };

    try {
        let state;
        if (Array.isArray(body.keywords)) {
            state = updatePaperLibraryKeywords(id, body.keywords);
        } else if (
            body.title !== undefined
            || body.titleZh !== undefined
            || body.authors !== undefined
            || body.journal !== undefined
            || body.year !== undefined
            || body.doi !== undefined
            || body.url !== undefined
            || body.abstractEn !== undefined
            || body.abstractZh !== undefined
            || body.referenceTypeCode !== undefined
            || body.volume !== undefined
            || body.issue !== undefined
            || body.pages !== undefined
            || Array.isArray(body.customCategories)
        ) {
            state = updatePaperLibraryRecord(id, {
                title: body.title,
                titleZh: body.titleZh,
                authors: body.authors,
                journal: body.journal,
                year: body.year,
                doi: body.doi,
                url: body.url,
                abstractEn: body.abstractEn,
                abstractZh: body.abstractZh,
                customCategories: body.customCategories,
                referenceTypeCode: body.referenceTypeCode,
                volume: body.volume,
                issue: body.issue,
                pages: body.pages
            });
        } else {
            state = updatePaperLibraryMeta(id, {
                adopted: body.adopted,
                storageCategory: body.storageCategory
            });
        }
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "更新关键词失败" },
            { status: 400 }
        );
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const state = deletePaperLibraryItem(id);
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "删除论文失败" },
            { status: 400 }
        );
    }
}
