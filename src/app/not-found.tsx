import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-6 py-24 sm:py-32 lg:px-8">
            <div className="text-center">
                <FileQuestion className="mx-auto h-12 w-12 text-blue-600" />
                <p className="mt-4 text-base font-semibold text-blue-600">404</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">页面未找到</h1>
                <p className="mt-6 text-base leading-7 text-slate-600">包含以下可能原因：链接错误、文章已移动或页面正在建设中。</p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        href="/"
                        className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        返回首页
                    </Link>
                    <Link href="/articles" className="text-sm font-semibold text-slate-900">
                        浏览文章库 <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
