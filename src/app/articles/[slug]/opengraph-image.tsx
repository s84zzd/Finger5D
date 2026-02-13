import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/mdx'

export const runtime = 'nodejs'

export const alt = 'Finger5D Article'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
    const { slug } = await params
    const article = await getArticleBySlug(slug)
    const title = article ? article.frontmatter.title : 'Finger5D Protocol'

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #1e293b, #0f172a)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: '80px',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '40px',
                    }}
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                        <path d="M8.5 8.5v.01" />
                        <path d="M16 16v.01" />
                        <path d="M12 12v.01" />
                        <path d="M8.5 16v.01" />
                        <path d="M16 8.5v.01" />
                    </svg>
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: '#60a5fa' }}>Finger5D</div>
                </div>

                <div style={{ fontSize: 64, fontWeight: 'bold', color: 'white', lineHeight: 1.2, maxWidth: '900px' }}>
                    {title}
                </div>

                <div style={{ fontSize: 28, color: '#94a3b8', marginTop: 40 }}>
                    Making Longevity Science Accessible
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
