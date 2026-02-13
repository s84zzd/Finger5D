import { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/mdx'

const baseUrl = 'https://finger5d.com' // Replace with actual domain

export default function sitemap(): MetadataRoute.Sitemap {
    const articles = getAllArticles()

    const articleUrls = articles.map((article) => ({
        url: `${baseUrl}/articles/${article.slug}`,
        lastModified: article.frontmatter.date,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }))

    const categories = ['cardio', 'physical', 'cognitive', 'nutrition', 'social']
    const categoryUrls = categories.map((cat) => ({
        url: `${baseUrl}/category/${cat}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/articles`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/frontiers`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/assessment`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        ...categoryUrls,
        ...articleUrls,
    ]
}
