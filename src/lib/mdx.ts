import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDirectory = path.join(process.cwd(), "src/content/articles");

export interface ArticleFrontmatter {
    title: string;
    date: string;
    category: "cardio" | "physical" | "cognitive" | "nutrition" | "social" | "frontier";
    tags: string[];
    summary: string;
    readingTime: string;
}

export interface Article {
    slug: string;
    frontmatter: ArticleFrontmatter;
    content: string;
}

export function getArticleSlugs() {
    if (!fs.existsSync(contentDirectory)) {
        return [];
    }
    return fs.readdirSync(contentDirectory).filter((file) => file.endsWith(".mdx"));
}

export function getArticleBySlug(slug: string): Article {
    const realSlug = slug.replace(/\.mdx$/, "");
    const fullPath = path.join(contentDirectory, `${realSlug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
        slug: realSlug,
        frontmatter: data as ArticleFrontmatter,
        content,
    };
}

export function getAllArticles(): Article[] {
    const slugs = getArticleSlugs();
    const articles = slugs
        .map((slug) => getArticleBySlug(slug))
        // Sort articles by date in descending order
        .sort((post1, post2) => (post1.frontmatter.date > post2.frontmatter.date ? -1 : 1));
    return articles;
}

export function getArticlesByCategory(category: string): Article[] {
    const allArticles = getAllArticles();
    return allArticles.filter((article) => article.frontmatter.category === category);
}
