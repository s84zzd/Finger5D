import { NextResponse } from "next/server";
import {
    ADMIN_AUTH_COOKIE,
    createAuthCookieValue,
    isAdminAuthConfigured,
    isValidAdminCredential
} from "@/lib/admin-auth";

export const runtime = "nodejs";

function normalizeNextPath(raw: string | null): string {
    if (!raw) {
        return "/admin";
    }
    if (raw.startsWith("/admin")) {
        return raw;
    }
    return "/admin";
}

export async function POST(request: Request) {
    const contentType = request.headers.get("content-type") ?? "";

    let username = "";
    let password = "";
    let nextPath: string | null = null;

    if (contentType.includes("application/json")) {
        const body = await request.json() as { username?: string; password?: string; token?: string; next?: string };
        username = String(body.username ?? "").trim();
        password = String(body.password ?? body.token ?? "");
        nextPath = body.next ?? null;
    } else {
        const formData = await request.formData();
        username = String(formData.get("username") ?? "").trim();
        password = String(formData.get("password") ?? formData.get("token") ?? "");
        nextPath = String(formData.get("next") ?? "");
    }

    if (!isAdminAuthConfigured()) {
        return NextResponse.json(
            { message: "服务端未配置后台登录凭证（ADMIN_USERS 或 ADMIN_TOKEN）。" },
            { status: 500 }
        );
    }

    if (!isValidAdminCredential(username, password)) {
        return NextResponse.json({ message: "用户名或密码错误，请重试。" }, { status: 401 });
    }

    const redirectTo = normalizeNextPath(nextPath);
    const response = NextResponse.json({ ok: true, redirectTo });
    response.cookies.set({
        name: ADMIN_AUTH_COOKIE,
        value: createAuthCookieValue(username, password),
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12
    });

    return response;
}
