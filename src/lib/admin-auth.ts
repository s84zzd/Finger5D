import type { NextRequest } from "next/server";

export const ADMIN_AUTH_COOKIE = "finger5d_admin_auth";

interface AdminUserCredential {
    username: string;
    password: string;
}

function normalizeCredential(input: unknown): AdminUserCredential | null {
    if (!input || typeof input !== "object") {
        return null;
    }

    const item = input as Record<string, unknown>;
    const username = String(item.username ?? "").trim();
    const password = String(item.password ?? "").trim();

    if (!username || !password) {
        return null;
    }

    return { username, password };
}

function parseAdminUsersFromJson(): AdminUserCredential[] {
    const raw = process.env.ADMIN_USERS_JSON;
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map(normalizeCredential)
            .filter((item): item is AdminUserCredential => Boolean(item));
    } catch {
        return [];
    }
}

function parseAdminUsersFromCsv(): AdminUserCredential[] {
    const raw = process.env.ADMIN_USERS ?? "";
    if (!raw.trim()) {
        return [];
    }

    return raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const separatorIndex = entry.indexOf(":");
            if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
                return null;
            }

            const username = entry.slice(0, separatorIndex).trim();
            const password = entry.slice(separatorIndex + 1).trim();

            if (!username || !password) {
                return null;
            }

            return { username, password };
        })
        .filter((item): item is AdminUserCredential => Boolean(item));
}

export function getAdminUsers(): AdminUserCredential[] {
    const fromJson = parseAdminUsersFromJson();
    if (fromJson.length > 0) {
        return fromJson;
    }
    return parseAdminUsersFromCsv();
}

export function getAdminToken(): string {
    return process.env.ADMIN_TOKEN ?? "";
}

export function isAdminUsersConfigured(): boolean {
    return getAdminUsers().length > 0;
}

export function isAdminTokenConfigured(): boolean {
    return getAdminToken().trim().length > 0;
}

export function isAdminAuthConfigured(): boolean {
    return isAdminUsersConfigured() || isAdminTokenConfigured();
}

export function isValidAdminToken(token: string): boolean {
    const expected = getAdminToken();
    if (!expected) {
        return false;
    }
    return token === expected;
}

export function isValidAdminCredential(username: string, password: string): boolean {
    const users = getAdminUsers();
    if (users.length > 0) {
        return users.some((item) => item.username === username && item.password === password);
    }

    return isValidAdminToken(password);
}

export function createAuthCookieValue(username: string, password: string): string {
    const users = getAdminUsers();
    if (users.length > 0) {
        return `${encodeURIComponent(username)}::${encodeURIComponent(password)}`;
    }
    return password;
}

function parseUserCookie(cookieValue: string): { username: string; password: string } | null {
    const separator = "::";
    const index = cookieValue.indexOf(separator);
    if (index < 0) {
        return null;
    }

    const encodedUsername = cookieValue.slice(0, index);
    const encodedPassword = cookieValue.slice(index + separator.length);

    try {
        const username = decodeURIComponent(encodedUsername).trim();
        const password = decodeURIComponent(encodedPassword);
        if (!username || !password) {
            return null;
        }
        return { username, password };
    } catch {
        return null;
    }
}

export function getAuthenticatedUsernameFromCookie(cookieValue: string): string | null {
    const users = getAdminUsers();

    if (users.length > 0) {
        const parsed = parseUserCookie(cookieValue);
        if (!parsed) {
            return null;
        }

        if (!isValidAdminCredential(parsed.username, parsed.password)) {
            return null;
        }

        return parsed.username;
    }

    if (isValidAdminToken(cookieValue)) {
        return "管理员";
    }

    return null;
}

export function getAuthenticatedUsernameFromCookieHeader(cookieHeader: string): string | null {
    const parts = cookieHeader.split(";").map((item) => item.trim());
    const pair = parts.find((item) => item.startsWith(`${ADMIN_AUTH_COOKIE}=`));
    if (!pair) {
        return null;
    }

    const cookieValue = pair.slice(ADMIN_AUTH_COOKIE.length + 1);
    return getAuthenticatedUsernameFromCookie(cookieValue);
}

export function isAuthenticatedRequest(request: NextRequest): boolean {
    const cookieValue = request.cookies.get(ADMIN_AUTH_COOKIE)?.value ?? "";
    return Boolean(getAuthenticatedUsernameFromCookie(cookieValue));
}
