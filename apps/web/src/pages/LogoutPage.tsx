import { onMount } from "solid-js";
import { useGithubAuth } from "@/contexts/github/GithubContext";

export default function LogoutPage() {
    const { logout } = useGithubAuth();

    onMount(() => {
        void (async () => {
            try {
                await logout();
            } finally {
                const baseUrl = import.meta.env.BASE_URL || "/";
                window.location.replace(baseUrl);
            }
        })();
    });

    return <div class="text-label-secondary flex h-dvh w-dvw items-center justify-center gap-2">Signing out...</div>;
}
