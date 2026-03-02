import Link from "next/link";
import { AdminLoginForm } from "@/components/AdminLoginForm";

interface LoginPageProps {
    searchParams: Promise<{ next?: string }>;
}

function normalizeNextPath(nextPath: string | undefined): string {
    if (nextPath && nextPath.startsWith("/admin")) {
        return nextPath;
    }
    return "/admin";
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams;
    const nextPath = normalizeNextPath(params.next);

    return (
        <div className="min-h-screen bg-slate-50 px-6 py-16">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-bold text-slate-900">后台登录</h1>
                <p className="mt-2 text-sm text-slate-600">仅运营三角色可见：规划管理员、论文检索编辑、草稿审议与发布编辑。</p>
                <p className="mt-1 text-sm text-slate-600">请使用个人用户名和密码登录后台。</p>
                <p className="mt-2 text-sm text-slate-600">
                    读者入口：
                    <Link href="/" className="ml-1 text-blue-600 underline">
                        前台首页
                    </Link>
                </p>
                <AdminLoginForm nextPath={nextPath} />
            </div>
        </div>
    );
}
