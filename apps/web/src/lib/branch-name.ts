export type BranchNameValidationResult =
    | { ok: true; normalized: string }
    | { ok: false; error: string };

const INVALID_BRANCH_CHARS = /[~^:?*\[\\]/;
const INVALID_CONTROL_OR_SPACE = /[\x00-\x20\x7f]/;

export function validateBranchName(input: string): BranchNameValidationResult {
    const normalized = input.trim();

    if (!normalized) {
        return { ok: false, error: "Branch name is required." };
    }

    if (normalized.length > 255) {
        return { ok: false, error: "Branch name must be 255 characters or less." };
    }

    if (normalized === "@") {
        return { ok: false, error: "Branch name cannot be @." };
    }

    if (INVALID_CONTROL_OR_SPACE.test(normalized)) {
        return { ok: false, error: "Branch name cannot contain spaces or control characters." };
    }

    if (normalized.startsWith("/") || normalized.endsWith("/")) {
        return { ok: false, error: "Branch name cannot start or end with '/'." };
    }

    if (normalized.includes("..")) {
        return { ok: false, error: "Branch name cannot contain '..'." };
    }

    if (normalized.includes("//")) {
        return { ok: false, error: "Branch name cannot contain '//'" };
    }

    if (INVALID_BRANCH_CHARS.test(normalized)) {
        return { ok: false, error: "Branch name contains invalid characters." };
    }

    if (normalized.includes("@{")) {
        return { ok: false, error: "Branch name cannot contain '@{'." };
    }

    if (normalized.endsWith(".")) {
        return { ok: false, error: "Branch name cannot end with '.'." };
    }

    const parts = normalized.split("/");

    if (parts.some((part) => part.startsWith("."))) {
        return { ok: false, error: "Branch name components cannot start with '.'." };
    }

    if (parts.some((part) => part.endsWith(".lock"))) {
        return { ok: false, error: "Branch name components cannot end with '.lock'." };
    }

    return { ok: true, normalized };
}
