import { getArticleBySlug, getArticleSlugs } from "@/lib/mdx";
import { MDXRenderer } from "@/components/MDXRenderer";
import { Tag } from "@/components/Tag";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const slugs = getArticleSlugs();
    return slugs.map((slug) => ({
        slug: slug.replace(/\.mdx$/, ""),
    }));
}

export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;
    try {
        const article = getArticleBySlug(slug);
        return {
            title: `${article.frontmatter.title} - Finger5D`,
            description: article.frontmatter.summary,
        };
    } catch (e) {
        return {
            title: "Article Not Found",
        };
    }
}

export default async function ArticlePage({ params }: PageProps) {
    const { slug } = await params;
    let article;
    try {
        article = getArticleBySlug(slug);
    } catch (e) {
        notFound();
    }

    return (
        <div className="bg-white py-16 sm:py-24">
            <article className="mx-auto max-w-3xl px-6 lg:px-8">
                <div className="mb-10">
                    <Link
                        href="/articles"
                        className="flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-8"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> 返回文章列表
                    </Link>

                    <div className="flex items-center gap-x-4 text-xs mb-4">
                        <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3.5 w-3.5" />
                            <time dateTime={article.frontmatter.date}>{article.frontmatter.date}</time>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {article.frontmatter.readingTime}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-600">
                            {article.frontmatter.category}
                        </span>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        {article.frontmatter.title}
                    </h1>
                    <p className="mt-6 text-xl leading-8 text-slate-600">
                        {article.frontmatter.summary}
                    </p>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-10">
                    <MDXRenderer source={article.content} />
                </div>

                <div className="mt-16 border-t border-slate-200 pt-8">
                    <div className="flex flex-wrap gap-2">
                        {article.frontmatter.tags.map(tag => (
                            <Tag key={tag} label={tag} />
                        ))}
                    </div>
                </div>
            </article>
        </div>
    );
}
