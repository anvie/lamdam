import React, { useCallback } from "react";
export type SimpleUser = {
    name: string;
    image: string;
    id: string;
};

export default function useSimpleUsers() {
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

            let res = await fetch(
                `/api/users/simple?page=${currentPage}&perPage=${perPage}`,
                { signal },
            );

            if (!res.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await res.json();

            setHasMore(data.result.length > 0);
            setItems((prevItems) => [...prevItems, ...data.result]);
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("Fetch aborted");
            } else {
                console.error("There was an error with the fetch operation:", error);
            }
        } finally {
            setIsLoading(false);
        }
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