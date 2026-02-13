import { getAllArticles } from "@/lib/mdx";
import { ArticleCard } from "@/components/ArticleCard";

export async function ArticleList() {
    const articles = getAllArticles();

    if (articles.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-slate-500">暂无文章发布。</p>
            </div>
        );
    }

    return (
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {articles.map((article) => (
                <ArticleCard
                    key={article.slug}
                    title={article.frontmatter.title}
                    excerpt={article.frontmatter.summary}
                    category={article.frontmatter.category}
                    date={article.frontmatter.date}
                    href={`/articles/${article.slug}`}
                />
            ))}
        </div>
    );
}
