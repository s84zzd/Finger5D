import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ArticleCardProps {
    title: string;
    excerpt: string;
    category: string;
    href: string;
    date: string;
}

export function ArticleCard({ title, excerpt, category, href, date }: ArticleCardProps) {
    return (
        <article className="group relative flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex w-full items-center gap-x-4 text-xs">
                <time dateTime={date} className="text-slate-500">
                    {date}
                </time>
                <span className="relative z-10 rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-600 hover:bg-blue-100">
                    {category}
                </span>
            </div>
            <div className="group relative">
                <h3 className="mt-3 text-xl font-semibold leading-6 text-slate-900 group-hover:text-blue-600 transition-colors">
                    <Link href={href}>
                        <span className="absolute inset-0" />
                        {title}
                    </Link>
                </h3>
                <p className="mt-3 line-clamp-3 text-base leading-relaxed text-slate-600">
                    {excerpt}
                </p>
            </div>
            <div className="mt-6 flex items-center gap-x-2 text-sm font-semibold text-blue-600">
                阅读全文 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
        </article>
    );
}
