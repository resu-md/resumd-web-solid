import { App as GitHubApp } from "@octokit/app";
import { OAuthApp } from "@octokit/oauth-app";
import { Octokit } from "@octokit/rest";
import { env as honoEnv } from "hono/adapter";
import type { Context } from "hono";
import { z } from "zod";
import { log } from "./logger.js";

const EnvSchema = z.object({
    APP_ORIGIN: z.string().url(),
    BACKEND_ORIGIN: z.string().url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GITHUB_APP_SLUG: z.string().min(1),
    GITHUB_APP_ID: z.string().regex(/^\d+$/, "GITHUB_APP_ID must be numeric"),
    GITHUB_PRIVATE_KEY: z.string().min(1),
    COOKIE_SECRET: z.string().min(32),
    NODE_ENV: z.string(),
});

export type RuntimeEnv = z.infer<typeof EnvSchema>;

export type RuntimeBindings = Partial<Record<keyof RuntimeEnv, string>>;

export type RuntimeServices = {
    env: RuntimeEnv;
    oauthApp: OAuthApp<any>;
    ghApp: GitHubApp;
    githubInstallationUrl: string;
    isProd: boolean;
};

export type ApiContext = Context<{ Bindings: RuntimeBindings; Variables: { runtime?: RuntimeServices } }>;

export class RuntimeEnvError extends Error {
    readonly message: string;
    readonly details?: string;

    constructor(message: string, details?: string) {
        super(message);
        this.name = "RuntimeEnvError";
        this.message = message;
        this.details = details;
    }
}

const runtimeCache = new Map<string, RuntimeServices>();

let envErrorLogged = false;
export function parseRuntimeEnv(rawEnv: unknown): RuntimeEnv {
    const parsed = EnvSchema.safeParse(rawEnv);
    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        }));
        if (!envErrorLogged) {
            log.error("Invalid runtime environment configuration", { issues: details });
            envErrorLogged = true;
        }
        throw new RuntimeEnvError("Invalid runtime environment configuration", JSON.stringify(details));
    }
    return parsed.data;
}

export function assertRuntimeEnvFromProcessEnv(): RuntimeEnv {
    return parseRuntimeEnv(process.env);
}

export function getRuntime(c: ApiContext): RuntimeServices {
    const env = parseRuntimeEnv(honoEnv<RuntimeEnv>(c));
    const cacheKey = [
        env.APP_ORIGIN,
        env.BACKEND_ORIGIN,
        env.GITHUB_CLIENT_ID,
        env.GITHUB_CLIENT_SECRET,
        env.GITHUB_APP_ID,
        env.GITHUB_APP_SLUG,
        env.GITHUB_PRIVATE_KEY,
        env.COOKIE_SECRET,
        env.NODE_ENV,
    ].join("|");

    const cached = runtimeCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const oauthApp = new OAuthApp({
        clientType: "github-app",
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectUrl: `${env.BACKEND_ORIGIN}/api/auth/callback`,
    });

    const ghApp = new GitHubApp({
        appId: Number(env.GITHUB_APP_ID),
        privateKey: env.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n"),
        Octokit,
    });

    const runtime: RuntimeServices = {
        env,
        oauthApp,
        ghApp,
        githubInstallationUrl: `https://github.com/apps/${encodeURIComponent(env.GITHUB_APP_SLUG)}/installations/new`,
        isProd: env.NODE_ENV === "production",
    };

    runtimeCache.set(cacheKey, runtime);

    return runtime;
}
