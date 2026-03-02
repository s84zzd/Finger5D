"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/admin/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, next: nextPath })
            });

            const payload = await response.json() as { message?: string; redirectTo?: string };

            if (!response.ok) {
                setError(payload.message ?? "登录失败");
                return;
            }

            router.replace(payload.redirectTo ?? "/admin");
        } catch {
            setError("网络异常，请稍后重试。");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm text-slate-700">
                用户名
                <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                    required
                />
            </label>

            <label className="block text-sm text-slate-700">
                密码
                <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                    required
                />
            </label>

            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
                {loading ? "登录中..." : "登录"}
            </button>
        </form>
    );
}
