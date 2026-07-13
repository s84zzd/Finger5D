import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { NextRequest } from "next/server";

export const ADMIN_AUTH_COOKIE = "finger5d_admin_auth";

interface AdminUserCredential {
    username: string;
    password: string;
}

interface SessionEntry {
    username: string;
    expiresAt: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_FILE = path.join(process.cwd(), "src", "data", "admin-sessions.json");

function readSessionStore(): Map<string, SessionEntry> {
    try {
        if (!fs.existsSync(SESSION_FILE)) return new Map();
        const raw = fs.readFileSync(SESSION_FILE, "utf8");
        const parsed = JSON.parse(raw) as Record<string, SessionEntry>;
        return new Map(Object.entries(parsed));
    } catch {
        return new Map();
    }
}

function writeSessionStore(store: Map<string, SessionEntry>): void {
    try {
        const dir = path.dirname(SESSION_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const obj: Record<string, SessionEntry> = {};
        for (const [k, v] of store) {
            obj[k] = v;
        }
        fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2), "utf8");
    } catch { /* ignore write errors */ }
}

function cleanupExpiredSessions(store: Map<string, SessionEntry>): Map<string, SessionEntry> {
    const now = Date.now();
    let changed = false;
    for (const [token, entry] of store) {
        if (entry.expiresAt <= now) {
            store.delete(token);
            changed = true;
        }
    }
    if (changed) writeSessionStore(store);
    return store;
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

export function createAuthCookieValue(username: string): string {
    const store = readSessionStore();
    cleanupExpiredSessions(store);
    const token = crypto.randomUUID();
    store.set(token, {
        username,
        expiresAt: Date.now() + SESSION_TTL_MS
    });
    writeSessionStore(store);
    return token;
}

function resolveUsernameFromToken(token: string): string | null {
    const store = readSessionStore();
    cleanupExpiredSessions(store);
    const entry = store.get(token);
    if (!entry) {
        return null;
    }
    if (entry.expiresAt <= Date.now()) {
        store.delete(token);
        writeSessionStore(store);
        return null;
    }
    return entry.username;
}

export function getAuthenticatedUsernameFromCookie(cookieValue: string): string | null {
    if (!cookieValue) {
        return null;
    }
    return resolveUsernameFromToken(cookieValue);
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
