import fs from "fs";
import path from "path";
import Link from "next/link";
import { CopyPathButton } from "@/components/CopyPathButton";

export const metadata = {
    title: "导出草稿目录 - Finger5D",
    description: "查看后台导出的未发布草稿文件。"
};

interface DraftFileItem {
    name: string;
    updatedAt: string;
    sizeKB: number;
    absolutePath: string;
}

function getDraftFiles(): DraftFileItem[] {
    const draftDir = path.join(process.cwd(), "src", "content", "drafts");
    if (!fs.existsSync(draftDir)) {
        return [];
    }

    return fs.readdirSync(draftDir)
        .filter((file) => file.endsWith(".mdx"))
        .map((file) => {
            const fullPath = path.join(draftDir, file);
            const stat = fs.statSync(fullPath);
            return {
                name: file,
                updatedAt: stat.mtime.toLocaleString("zh-CN"),
                sizeKB: Number((stat.size / 1024).toFixed(1)),
                absolutePath: fullPath
            };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export default function AdminDraftsPage() {
    const files = getDraftFiles();

    return (
        <div className="min-h-screen bg-slate-50 py-10">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">导出草稿目录</h1>
                    <Link href="/admin" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                        返回管理后台
                    </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600">目录路径：src/content/drafts</p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    {files.length === 0 ? (
                        <p className="text-slate-500">当前没有已导出的草稿文件。</p>
                    ) : (
                        <ul className="divide-y divide-slate-200">
                            {files.map((file) => (
                                <li key={file.name} className="py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-slate-900">{file.name}</p>
                                            <p className="mt-1 text-sm text-slate-500">更新时间：{file.updatedAt} · 大小：{file.sizeKB} KB</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CopyPathButton
                                                value={`src/content/drafts/${file.name}`}
                                                label="复制相对路径"
                                            />
                                            <CopyPathButton
                                                value={file.absolutePath}
                                                label="复制绝对路径"
                                                title={file.absolutePath}
                                            />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
