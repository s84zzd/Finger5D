import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ArticleDetail, FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

const ARTICLES_DIR = path.join(process.cwd(), "src", "content", "articles");

function estimateWordCount(content: string): number {
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
    const englishWords = content.replace(/[\u4e00-\u9fff]/g, " ").split(/\s+/).filter(Boolean).length;
    return chineseChars + englishWords;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ message: "文章不存在" }, { status: 404 });
        }

        const raw = fs.readFileSync(filePath, "utf8");
        const { data, content } = matter(raw);

        const article: ArticleDetail = {
            slug,
            title: String(data.title ?? slug),
            date: String(data.date ?? ""),
            category: (String(data.category ?? "frontier") as FiveDCategory | "frontier"),
            tags: Array.isArray(data.tags) ? data.tags : [],
            summary: String(data.summary ?? ""),
            readingTime: String(data.readingTime ?? ""),
            wordCount: estimateWordCount(content),
            filePath: `src/content/articles/${slug}.mdx`,
            content
        };

        return NextResponse.json(article);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "获取文章详情失败" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ message: "文章不存在" }, { status: 404 });
        }

        const body = await request.json() as {
            title?: string;
            date?: string;
            category?: string;
            tags?: string[];
            summary?: string;
            readingTime?: string;
            content?: string;
        };

        const raw = fs.readFileSync(filePath, "utf8");
        const { data: existingData, content: existingContent } = matter(raw);

        const updatedData: Record<string, unknown> = { ...existingData };
        if (body.title !== undefined) updatedData.title = body.title;
        if (body.date !== undefined) updatedData.date = body.date;
        if (body.category !== undefined) updatedData.category = body.category;
        if (body.tags !== undefined) updatedData.tags = body.tags;
        if (body.summary !== undefined) updatedData.summary = body.summary;
        if (body.readingTime !== undefined) updatedData.readingTime = body.readingTime;

        const updatedContent = body.content !== undefined ? body.content : existingContent;
        const updatedRaw = matter.stringify(updatedContent, updatedData);

        fs.writeFileSync(filePath, updatedRaw, "utf8");

        return NextResponse.json({ ok: true, slug });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "更新文章失败" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ message: "文章不存在" }, { status: 404 });
        }

        fs.unlinkSync(filePath);
        return NextResponse.json({ ok: true, slug });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "删除文章失败" },
            { status: 500 }
        );
    }
}
