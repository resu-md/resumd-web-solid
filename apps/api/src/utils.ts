import { z } from "zod";
import type { ApiContext } from "./runtime.js";

export class ApiError extends Error {
    readonly status: number;
    readonly hint?: string;

    constructor(status: number, message: string, hint?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.hint = hint;
    }
}

export function safeReturnTo(value: string | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    if (!value.startsWith("/") || value.startsWith("//")) {
        return fallback;
    }

    return value;
}

export function statusOf(error: unknown): number | null {
    if (typeof error !== "object" || !error) {
        return null;
    }

    if ("status" in error && typeof (error as { status?: unknown }).status === "number") {
        return (error as { status: number }).status;
    }

    return null;
}

export function ensureBranchName(branch: string, fieldName: string): string {
    const normalized = branch.trim();

    if (
        !normalized ||
        normalized.length > 255 ||
        normalized === "@" ||
        /[\x00-\x20\x7f]/.test(normalized) ||
        normalized.startsWith("/") ||
        normalized.endsWith("/") ||
        normalized.includes("..") ||
        normalized.includes("//") ||
        normalized.includes(" ") ||
        normalized.includes("~") ||
        normalized.includes("^") ||
        normalized.includes(":") ||
        normalized.includes("?") ||
        normalized.includes("*") ||
        normalized.includes("[") ||
        normalized.includes("\\") ||
        normalized.includes("@{") ||
        normalized.endsWith(".") ||
        normalized.split("/").some((part) => part.startsWith(".")) ||
        normalized.split("/").some((part) => part.endsWith(".lock"))
    ) {
        throw new ApiError(400, `${fieldName} is not a valid branch name`);
    }

    return normalized;
}

export function requireQueryParam(c: ApiContext, key: string): string {
    const value = c.req.query(key)?.trim() ?? "";
    if (!value) {
        throw new ApiError(400, `${key} is required`);
    }

    return value;
}

export function parseOptionalPositiveIntQuery(c: ApiContext, key: string, defaultValue: number, maxValue: number): number {
    const rawValue = c.req.query(key)?.trim();
    if (!rawValue) {
        return defaultValue;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new ApiError(400, `${key} must be a positive integer`);
    }

    if (parsed > maxValue) {
        throw new ApiError(400, `${key} must be <= ${maxValue}`);
    }

    return parsed;
}

export async function parseJsonBody<T>(c: ApiContext, schema: z.ZodType<T>): Promise<T> {
    let body: unknown;

    try {
        body = await c.req.json();
    } catch {
        throw new ApiError(400, "Invalid JSON body");
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request body");
    }

    return parsed.data;
}
