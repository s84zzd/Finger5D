import { NextResponse } from "next/server";
import { getAuthenticatedUsernameFromCookieHeader } from "@/lib/admin-auth";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ArticleSummary, FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

const ARTICLES_DIR = path.join(process.cwd(), "src", "content", "articles");

function estimateWordCount(content: string): number {
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
    const englishWords = content.replace(/[\u4e00-\u9fff]/g, " ").split(/\s+/).filter(Boolean).length;
    return chineseChars + englishWords;
}

function readArticleSummary(filename: string): ArticleSummary | null {
    try {
        const filePath = path.join(ARTICLES_DIR, filename);
        const raw = fs.readFileSync(filePath, "utf8");
        const { data, content } = matter(raw);
        const slug = filename.replace(/\.mdx$/, "");

        return {
            slug,
            title: String(data.title ?? slug),
            date: String(data.date ?? ""),
            category: (String(data.category ?? "frontier") as FiveDCategory | "frontier"),
            tags: Array.isArray(data.tags) ? data.tags : [],
            summary: String(data.summary ?? ""),
            readingTime: String(data.readingTime ?? ""),
            wordCount: estimateWordCount(content),
            filePath: `src/content/articles/${filename}`
        };
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const actor = getAuthenticatedUsernameFromCookieHeader(cookieHeader);
    if (!actor) {
        return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    try {
        if (!fs.existsSync(ARTICLES_DIR)) {
            return NextResponse.json({ articles: [] });
        }

        const filenames = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
        const articles = filenames
            .map(readArticleSummary)
            .filter((a): a is ArticleSummary => Boolean(a))
            .sort((a, b) => (b.date > a.date ? 1 : -1));

        return NextResponse.json({ articles });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "获取文章列表失败" },
            { status: 500 }
        );
    }
}
