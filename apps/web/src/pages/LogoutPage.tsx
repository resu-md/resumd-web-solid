import { onMount } from "solid-js";
import { useGithubAuth } from "@/contexts/github/GithubContext";
import Loading from "@/components/_layout/Loading";

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

    return <Loading>Signing out...</Loading>;
}
