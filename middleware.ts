import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthConfigured, isAuthenticatedRequest } from "@/lib/admin-auth";

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    const isAdminApi = pathname.startsWith("/api/admin");
    const isAuthApi = pathname.startsWith("/api/admin/auth");
    const isAdminLoginPage = pathname === "/admin/login";
    const isAdminPage = pathname.startsWith("/admin");

    if (!isAdminApi && !isAdminPage) {
        return NextResponse.next();
    }

    if (isAuthApi || isAdminLoginPage) {
        return NextResponse.next();
    }

    if (!isAdminAuthConfigured()) {
        if (isAdminApi) {
            return NextResponse.json({ message: "后台登录凭证未配置（ADMIN_USERS 或 ADMIN_TOKEN），后台接口已禁用。" }, { status: 503 });
        }

        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname + search);
        return NextResponse.redirect(url);
    }

    if (!isAuthenticatedRequest(request)) {
        if (isAdminApi) {
            return NextResponse.json({ message: "未授权访问，请先登录后台。" }, { status: 401 });
        }

        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname + search);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"]
};
