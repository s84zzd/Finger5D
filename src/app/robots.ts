import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/assessment/result', // Don't index personalized results
        },
        sitemap: 'https://finger5d.com/sitemap.xml',
    }
}
