import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { ApiContext, RuntimeServices } from "./runtime.js";

export type AuthCookie = {
    token: string;
    refreshToken?: string;
    expiresAt?: string;
    refreshTokenExpiresAt?: string;
    tokenType?: string;
    scopes?: string[];
};

export type AuthFlowContextCookie = {
    returnTo: string;
};

export type AuthInstallContextCookie = {
    returnTo: string;
};

export type CookieState = {
    state: string;
};

export const COOKIE_AUTH = "resumd_gh_auth";
export const COOKIE_CTX = "resumd_gh_ctx";
export const COOKIE_INSTALL_CTX = "resumd_gh_install_ctx";
export const COOKIE_STATE = "resumd_gh_state";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const cookieKeyCache = new Map<string, Promise<CryptoKey>>();

function bytesToBase64(bytes: Uint8Array): string {
    const bufferGlobal = globalThis as typeof globalThis & {
        Buffer?: {
            from: (
                input: ArrayBuffer | Uint8Array | string,
                encoding?: string,
            ) => {
                toString: (encoding?: string) => string;
            };
        };
    };

    if (bufferGlobal.Buffer) {
        return bufferGlobal.Buffer.from(bytes).toString("base64");
    }

    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
    const bufferGlobal = globalThis as typeof globalThis & {
        Buffer?: {
            from: (input: string, encoding: string) => Uint8Array;
        };
    };

    if (bufferGlobal.Buffer) {
        return new Uint8Array(bufferGlobal.Buffer.from(base64, "base64"));
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function base64UrlFromBytes(bytes: Uint8Array): string {
    return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return base64ToBytes(padded);
}

async function getCookieKey(secret: string): Promise<CryptoKey> {
    const cached = cookieKeyCache.get(secret);
    if (cached) {
        return cached;
    }

    const keyPromise = (async () => {
        const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(secret));
        return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    })();

    cookieKeyCache.set(secret, keyPromise);
    return keyPromise;
}

async function sealCookieValue(secret: string, value: unknown): Promise<string> {
    const key = await getCookieKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = textEncoder.encode(JSON.stringify(value));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

    return `${base64UrlFromBytes(iv)}.${base64UrlFromBytes(new Uint8Array(encrypted))}`;
}

async function unsealCookieValue<T>(secret: string, token: string): Promise<T | null> {
    try {
        const [ivPart, payloadPart] = token.split(".");
        if (!ivPart || !payloadPart) {
            return null;
        }

        const key = await getCookieKey(secret);
        const iv = base64UrlToBytes(ivPart);
        const payload = base64UrlToBytes(payloadPart);
        const ivBuffer = new Uint8Array(iv.byteLength);
        ivBuffer.set(iv);
        const payloadBuffer = new Uint8Array(payload.byteLength);
        payloadBuffer.set(payload);

        const plaintext = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: ivBuffer,
            },
            key,
            payloadBuffer,
        );

        return JSON.parse(textDecoder.decode(new Uint8Array(plaintext))) as T;
    } catch {
        return null;
    }
}

export async function setSealedCookie(
    c: ApiContext,
    runtime: RuntimeServices,
    name: string,
    value: unknown,
    maxAgeSeconds?: number,
): Promise<void> {
    const sealed = await sealCookieValue(runtime.env.COOKIE_SECRET, value);

    setCookie(c, name, sealed, {
        path: "/",
        httpOnly: true,
        secure: runtime.isProd,
        sameSite: "Lax",
        maxAge: maxAgeSeconds,
    });
}

export async function readSealedCookie<T>(c: ApiContext, runtime: RuntimeServices, name: string): Promise<T | null> {
    const raw = getCookie(c, name);
    if (!raw) {
        return null;
    }

    return unsealCookieValue<T>(runtime.env.COOKIE_SECRET, raw);
}

export function clearCookie(c: ApiContext, runtime: RuntimeServices, name: string): void {
    deleteCookie(c, name, {
        path: "/",
        httpOnly: true,
        secure: runtime.isProd,
        sameSite: "Lax",
    });
}

export function randomState(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return base64UrlFromBytes(bytes);
}
