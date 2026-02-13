import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export const alt = 'Finger5D - 科学衰老科普平台'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #eff6ff, #ffffff)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px',
                    }}
                >
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                        <path d="M8.5 8.5v.01" />
                        <path d="M16 16v.01" />
                        <path d="M12 12v.01" />
                        <path d="M8.5 16v.01" />
                        <path d="M16 8.5v.01" />
                    </svg>
                </div>
                <div style={{ fontSize: 64, fontWeight: 'bold', color: '#1e293b' }}>
                    Finger5D
                </div>
                <div style={{ fontSize: 32, color: '#475569', marginTop: 20 }}>
                    Making Longevity Science Accessible
                </div>
                <div style={{ fontSize: 24, color: '#3b82f6', marginTop: 40, fontWeight: 'bold' }}>
                    芬格健康模型 · 科学抗衰
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
