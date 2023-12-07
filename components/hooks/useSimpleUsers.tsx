import { UserRoleType } from "@/models";
import React, { useCallback } from "react";
export type SimpleUser = {
    name: string;
    image: string;
    id: string;
};

export default function useSimpleUsers(roles: UserRoleType[] = []) {
    const [items, setItems] = React.useState<SimpleUser[]>([]);
    const [hasMore, setHasMore] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const perPage = 10;

    const loadSimpleUsers = useCallback(async (currentPage: number) => {
        const controller = new AbortController();
        const { signal } = controller;

        if (!hasMore) return;

        try {
            setIsLoading(true);

            const url = new URL("/api/users/simple", window.location.origin);
            url.searchParams.append("page", currentPage.toString());
            url.searchParams.append("perPage", perPage.toString());
            roles.forEach((role) => {
                url.searchParams.append("role", role);
            });

            let res = await fetch(url.toString(), { signal });

            if (!res.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await res.json();
            const { entries, paging: { hasNext } } = data.result;

            setHasMore(hasNext);
            setItems((prevItems) => [...prevItems, ...entries]);
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("Fetch aborted");
            } else {
                console.error("There was an error with the fetch operation:", error);
            }
        } finally {
            setIsLoading(false);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMore])

    React.useEffect(() => {
        loadSimpleUsers(page);
    }, [page, loadSimpleUsers]);

    const onLoadMore = () => {
        const newPage = page + 1;

        setPage(newPage);
        loadSimpleUsers(newPage);
    }

    return {
        items,
        hasMore,
        isLoading,
        onLoadMore,
    }
}