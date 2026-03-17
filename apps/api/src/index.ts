import { Octokit } from "@octokit/rest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { BootstrapResponse, RepositoriesResponse, SaveRepoRequest, SaveRepoResponse } from "./types.js";
import {
    assertRepoAccessible,
    ensureTargetBranch,
    getRepositoryInformation,
    hasAuthorizedRepos,
    listBranchesForRepo,
    listInstalledRepos,
    loadFilesResponse,
    requireInstallationOctokit,
    requireUserOctokit,
} from "./github.js";
import { getRuntime, RuntimeEnvError, type ApiContext, type RuntimeBindings, type RuntimeServices } from "./runtime.js";
import { log } from "./logger.js";
import {
    ensureBranchName,
    safeReturnTo,
    statusOf,
    ApiError,
    requireQueryParam,
    parseOptionalPositiveIntQuery,
    parseJsonBody,
} from "./utils.js";
import {
    clearCookie,
    COOKIE_AUTH,
    COOKIE_CTX,
    COOKIE_INSTALL_CTX,
    COOKIE_STATE,
    randomState,
    readSealedCookie,
    setSealedCookie,
    type AuthCookie,
    type AuthFlowContextCookie,
    type AuthInstallContextCookie,
    type CookieState,
} from "./cookies.js";

const SaveRepoRequestSchema: z.ZodType<SaveRepoRequest> = z.object({
    targetBranch: z.string().trim().min(1),
    baseBranch: z.string().trim().min(1).optional(),
    createBranchIfMissing: z.boolean().optional(),
    expectedHeadSha: z.string().trim().min(1).optional(),
    message: z.string().trim().min(1).optional(),
    files: z.object({
        markdown: z.string(),
        css: z.string(),
        markdownPath: z.string().trim().min(1),
        cssPath: z.string().trim().min(1),
    }),
});

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 100;
const MAX_PER_PAGE = 100;

const app = new Hono<{ Bindings: RuntimeBindings; Variables: { runtime?: RuntimeServices } }>();

function requireRuntime(c: ApiContext): RuntimeServices {
    const runtime = c.get("runtime");
    if (!runtime) throw new ApiError(500, "Internal server error (CODE: 1301)");
    return runtime;
}

app.use("*", async (c, next) => {
    const runtime = getRuntime(c);
    c.set("runtime", runtime);
    return next();
});

app.get("/", (c) => {
    return c.json({ ok: true });
});

app.use("/api/*", async (c, next) => {
    const runtime = requireRuntime(c);
    const middleware = cors({
        origin: runtime.env.APP_ORIGIN,
        credentials: true,
    });
    return middleware(c, next);
});

app.get("/api/auth/start", async (c) => {
    const runtime = requireRuntime(c);
    const returnTo = safeReturnTo(c.req.query("returnTo"), "/");

    const flowContext: AuthFlowContextCookie = { returnTo };
    await setSealedCookie(c, runtime, COOKIE_CTX, flowContext, 60 * 60);

    const state = randomState();
    await setSealedCookie(c, runtime, COOKIE_STATE, { state } satisfies CookieState, 15 * 60);

    const auth = await readSealedCookie<AuthCookie>(c, runtime, COOKIE_AUTH);
    if (!auth?.token) {
        const { url } = runtime.oauthApp.getWebFlowAuthorizationUrl({ state });
        return c.redirect(url, 302);
    }

    try {
        const userOctokit = await requireUserOctokit(c, runtime);
        await userOctokit.rest.users.getAuthenticated();
        return c.redirect(`${runtime.env.APP_ORIGIN}${returnTo}`, 302);
    } catch (error) {
        clearCookie(c, COOKIE_AUTH);
        const { url } = runtime.oauthApp.getWebFlowAuthorizationUrl({ state });
        return c.redirect(url, 302);
    }
});

app.get("/api/auth/callback", async (c) => {
    const runtime = requireRuntime(c);
    const code = c.req.query("code")?.trim() ?? "";
    const state = c.req.query("state")?.trim() ?? "";
    const oauthError = c.req.query("error")?.trim();

    if (oauthError) {
        return c.text(`GitHub OAuth error: ${oauthError}`, 400);
    }

    if (!code || !state) {
        return c.text("Missing code/state", 400);
    }

    const stateCookie = await readSealedCookie<CookieState>(c, runtime, COOKIE_STATE);
    if (!stateCookie?.state || stateCookie.state !== state) {
        return c.text("Invalid state", 400);
    }
    clearCookie(c, COOKIE_STATE);

    const tokenResult = await runtime.oauthApp.createToken({ code, state });
    const auth = ((tokenResult as { authentication?: AuthCookie }).authentication ?? tokenResult) as AuthCookie;

    if (!auth?.token) {
        // If we got this far, the code/state were valid but token missing
        // This is likely a GitHub API configuration issue
        throw new ApiError(500, "Internal server error (CODE: 1303)");
    }

    await setSealedCookie(c, runtime, COOKIE_AUTH, auth, 180 * 24 * 60 * 60);

    const flowContext = await readSealedCookie<AuthFlowContextCookie>(c, runtime, COOKIE_CTX);
    const returnTo = safeReturnTo(flowContext?.returnTo, "/");
    clearCookie(c, COOKIE_CTX);
    clearCookie(c, COOKIE_INSTALL_CTX);

    let needsRepoAuthorization = false;
    try {
        const userOctokit = new Octokit({ auth: auth.token });
        const hasRepos = await hasAuthorizedRepos(runtime, userOctokit);
        needsRepoAuthorization = !hasRepos;
    } catch (error) {
        // log.warn`Failed to check authorized repositories after login: ${error}`;
    }

    if (needsRepoAuthorization) {
        const installContext: AuthInstallContextCookie = { returnTo };
        await setSealedCookie(c, runtime, COOKIE_INSTALL_CTX, installContext, 15 * 60);
        return c.redirect("/api/auth/manage", 302);
    }

    const authorizeUrl = `/api/auth/start?returnTo=${encodeURIComponent(returnTo)}`;

    return c.redirect(authorizeUrl, 302);
});

app.post("/api/auth/logout", async (c) => {
    clearCookie(c, COOKIE_AUTH);
    clearCookie(c, COOKIE_CTX);
    clearCookie(c, COOKIE_INSTALL_CTX);
    clearCookie(c, COOKIE_STATE);
    return c.json({ ok: true });
});

app.get("/api/auth/manage", async (c) => {
    const runtime = requireRuntime(c);
    return c.redirect(runtime.githubInstallationUrl, 302);
});

app.get("/api/auth/setup", async (c) => {
    const runtime = requireRuntime(c);
    try {
        const installContext = await readSealedCookie<AuthInstallContextCookie>(c, runtime, COOKIE_INSTALL_CTX);
        const returnTo = safeReturnTo(installContext?.returnTo, "/");
        clearCookie(c, COOKIE_INSTALL_CTX);
        return c.redirect(`${runtime.env.APP_ORIGIN}${returnTo}`, 302);
    } catch (error) {
        // log.warn`Failed to resolve setup redirect: ${error}`;
        return c.redirect(`${runtime.env.APP_ORIGIN}/`, 302);
    }
});

app.get("/api/bootstrap", async (c) => {
    const runtime = requireRuntime(c);
    const owner = c.req.query("owner")?.trim() ?? "";
    const repo = c.req.query("repo")?.trim() ?? "";

    const auth = await readSealedCookie<AuthCookie>(c, runtime, COOKIE_AUTH);
    if (!auth?.token) {
        return c.body(null, 401);
    }

    let octokit;
    try {
        octokit = await requireUserOctokit(c, runtime);
    } catch (error) {
        if (statusOf(error) === 401) {
            clearCookie(c, COOKIE_AUTH);
            return c.body(null, 401);
        }

        throw error;
    }

    const me = await octokit.rest.users.getAuthenticated();

    let selected: BootstrapResponse["selected"] = null;
    if (owner && repo) {
        try {
            const selectedRepository = await getRepositoryInformation(runtime, octokit, owner, repo);
            const branchesResult = await listBranchesForRepo(octokit, owner, repo, {
                page: DEFAULT_PAGE,
                perPage: DEFAULT_PER_PAGE,
            });

            selected = {
                repository: selectedRepository,
                branches: {
                    items: branchesResult.branches,
                    pageInfo: branchesResult.pagination,
                },
            };
        } catch (error) {
            const status = statusOf(error);
            if (status === 401) {
                clearCookie(c, COOKIE_AUTH);
                return c.body(null, 401);
            }
            // Any other error (404 not found, 409 app not installed, etc.) means the repo is inaccessible
            // log.warn`Failed to load selected repository ${owner}/${repo}: ${error}`;
        }
    }

    const response: BootstrapResponse = {
        user: {
            username: me.data.login,
            avatarUrl: me.data.avatar_url,
        },
        selected,
    };

    return c.json(response);
});

app.get("/api/repositories", async (c) => {
    const runtime = requireRuntime(c);
    const page = parseOptionalPositiveIntQuery(c, "page", DEFAULT_PAGE, Number.MAX_SAFE_INTEGER);
    const perPage = parseOptionalPositiveIntQuery(c, "perPage", DEFAULT_PER_PAGE, MAX_PER_PAGE);

    let octokit;
    try {
        octokit = await requireUserOctokit(c, runtime);
    } catch (error) {
        if (statusOf(error) === 401) {
            clearCookie(c, COOKIE_AUTH);
            return c.body(null, 401);
        }

        throw error;
    }

    try {
        const repositoriesResult = await listInstalledRepos(runtime, octokit, { page, perPage });
        const response: RepositoriesResponse = {
            repositories: {
                items: repositoriesResult.repositories,
                pageInfo: repositoriesResult.pagination,
            },
        };
        return c.json(response);
    } catch (error) {
        if (statusOf(error) === 401) {
            clearCookie(c, COOKIE_AUTH);
            return c.body(null, 401);
        }

        throw error;
    }
});

app.get("/api/files", async (c) => {
    const runtime = requireRuntime(c);
    const owner = requireQueryParam(c, "owner");
    const repo = requireQueryParam(c, "repo");
    const branch = ensureBranchName(requireQueryParam(c, "branch"), "branch");

    const octokit = await requireUserOctokit(c, runtime);
    const response = await loadFilesResponse(runtime, octokit, owner, repo, branch);
    return c.json(response);
});

app.post("/api/save", async (c) => {
    const runtime = requireRuntime(c);
    const owner = requireQueryParam(c, "owner");
    const repo = requireQueryParam(c, "repo");

    const body = await parseJsonBody(c, SaveRepoRequestSchema);
    const targetBranch = ensureBranchName(body.targetBranch, "targetBranch");
    const baseBranch = body.baseBranch ? ensureBranchName(body.baseBranch, "baseBranch") : undefined;

    const userOctokit = await requireUserOctokit(c, runtime);
    await assertRepoAccessible(userOctokit, owner, repo);

    const botOctokit = await requireInstallationOctokit(runtime, owner, repo);
    const repoInfo = await botOctokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoInfo.data.default_branch;

    const branchState = await ensureTargetBranch({
        octokit: botOctokit,
        owner,
        repo,
        targetBranch,
        defaultBranch,
        baseBranch,
        createBranchIfMissing: body.createBranchIfMissing ?? false,
    });

    if (body.expectedHeadSha && body.expectedHeadSha !== branchState.headSha) {
        return c.json(
            {
                error: "Branch head changed. Refresh before saving again.",
                currentHeadSha: branchState.headSha,
            },
            409,
        );
    }

    const markdownPath = body.files.markdownPath;
    const cssPath = body.files.cssPath;

    const [markdownBlob, cssBlob, currentCommit] = await Promise.all([
        botOctokit.rest.git.createBlob({
            owner,
            repo,
            content: body.files.markdown,
            encoding: "utf-8",
        }),
        botOctokit.rest.git.createBlob({
            owner,
            repo,
            content: body.files.css,
            encoding: "utf-8",
        }),
        botOctokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: branchState.headSha,
        }),
    ]);

    const tree = await botOctokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentCommit.data.tree.sha,
        tree: [
            {
                path: markdownPath,
                mode: "100644",
                type: "blob",
                sha: markdownBlob.data.sha,
            },
            {
                path: cssPath,
                mode: "100644",
                type: "blob",
                sha: cssBlob.data.sha,
            },
        ],
    });

    const commit = await botOctokit.rest.git.createCommit({
        owner,
        repo,
        message: body.message ?? "Update resume via resumd web",
        tree: tree.data.sha,
        parents: [branchState.headSha],
    });

    try {
        await botOctokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${targetBranch}`,
            sha: commit.data.sha,
            force: false,
        });
    } catch (error) {
        if (statusOf(error) === 422) {
            return c.json({ error: "Branch head changed while saving. Refresh and try again." }, 409);
        }

        throw error;
    }

    const response: SaveRepoResponse = {
        ok: true,
        branch: targetBranch,
        commitSha: commit.data.sha,
        headSha: commit.data.sha,
        createdBranch: branchState.createdBranch,
        updatedPaths: {
            markdown: markdownPath,
            css: cssPath,
        },
    };

    return c.json(response);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((error, c) => {
    if (error instanceof RuntimeEnvError) {
        return c.json("Internal server error (CODE: 1302)", 500);
    }

    if (error instanceof ApiError) {
        if (error.status === 401) {
            return c.body(null, 401);
        }

        return c.json(
            {
                error: error.message,
                ...(error.hint ? { hint: error.hint } : {}),
            },
            { status: error.status as any },
        );
    }

    if (error instanceof z.ZodError) {
        return c.json(
            {
                error: error.issues[0]?.message ?? "Invalid request",
            },
            400,
        );
    }

    const status = statusOf(error) ?? 500;
    const message =
        typeof error === "object" && error && "message" in error && typeof error.message === "string"
            ? error.message
            : "Internal error";

    if (status === 401) {
        return c.body(null, 401);
    }

    return c.json({ error: message }, { status: status as any });
});

export default app;
export type * from "./types.js";
